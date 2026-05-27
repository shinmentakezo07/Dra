package db

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var errUnsupportedQuery = errors.New("unsupported sql query for mongodb adapter")

// mongoQuerier implements the Querier interface for MongoDB.
type mongoQuerier struct {
	db *mongo.Database
}

func newMongoQuerier(db *mongo.Database) *mongoQuerier {
	return &mongoQuerier{db: db}
}

func (q *mongoQuerier) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	parsed, err := parseSQL(sql, args)
	if err != nil {
		return nil, fmt.Errorf("mongodb query: %w", err)
	}

	switch parsed.kind {
	case "select":
		return q.querySelect(ctx, parsed)
	default:
		return nil, fmt.Errorf("%w: Query only supports SELECT, got %s", errUnsupportedQuery, parsed.kind)
	}
}

func (q *mongoQuerier) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	parsed, err := parseSQL(sql, args)
	if err != nil {
		return &mongoRow{err: err}
	}

	switch parsed.kind {
	case "select":
		return q.queryRowSelect(ctx, parsed)
	case "insert":
		return q.queryRowInsert(ctx, parsed)
	case "count":
		return q.queryRowCount(ctx, parsed)
	case "coalesce_sum":
		return q.queryRowCoalesceSum(ctx, parsed)
	case "max_version":
		return q.queryRowMaxVersion(ctx, parsed)
	default:
		return &mongoRow{err: fmt.Errorf("%w: QueryRow does not support %s", errUnsupportedQuery, parsed.kind)}
	}
}

func (q *mongoQuerier) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	parsed, err := parseSQL(sql, args)
	if err != nil {
		return pgconn.CommandTag{}, fmt.Errorf("mongodb exec: %w", err)
	}

	switch parsed.kind {
	case "insert":
		return q.execInsert(ctx, parsed)
	case "update":
		return q.execUpdate(ctx, parsed)
	case "delete":
		return q.execDelete(ctx, parsed)
	default:
		return pgconn.CommandTag{}, fmt.Errorf("%w: Exec does not support %s", errUnsupportedQuery, parsed.kind)
	}
}

// ---------------------------------------------------------------------------
// SELECT multi-row
// ---------------------------------------------------------------------------

func (q *mongoQuerier) querySelect(ctx context.Context, p *parsedSQL) (pgx.Rows, error) {
	coll := q.db.Collection(p.table)
	opts := options.Find()

	if p.limit > 0 {
		opts.SetLimit(p.limit)
	}
	if p.offset > 0 {
		opts.SetSkip(p.offset)
	}
	if p.orderBy != "" {
		dir := 1
		if p.orderDesc {
			dir = -1
		}
		opts.SetSort(bson.D{{Key: p.orderBy, Value: dir}})
	}

	cursor, err := coll.Find(ctx, p.filter, opts)
	if err != nil {
		return nil, err
	}

	var docs []bson.M
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, err
	}

	return &mongoRows{
		docs: docs,
		cols: p.columns,
		tag:  pgconn.NewCommandTag(fmt.Sprintf("SELECT %d", len(docs))),
	}, nil
}

// ---------------------------------------------------------------------------
// SELECT single-row
// ---------------------------------------------------------------------------

func (q *mongoQuerier) queryRowSelect(ctx context.Context, p *parsedSQL) pgx.Row {
	coll := q.db.Collection(p.table)
	opts := options.FindOne()

	if p.orderBy != "" {
		dir := 1
		if p.orderDesc {
			dir = -1
		}
		opts.SetSort(bson.D{{Key: p.orderBy, Value: dir}})
	}

	var doc bson.M
	err := coll.FindOne(ctx, p.filter, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return &mongoRow{err: pgx.ErrNoRows}
		}
		return &mongoRow{err: err}
	}

	return &mongoRow{values: extractValues(doc, p.columns)}
}

// ---------------------------------------------------------------------------
// COUNT(*)
// ---------------------------------------------------------------------------

func (q *mongoQuerier) queryRowCount(ctx context.Context, p *parsedSQL) pgx.Row {
	coll := q.db.Collection(p.table)
	count, err := coll.CountDocuments(ctx, p.filter)
	if err != nil {
		return &mongoRow{err: err}
	}
	return &mongoRow{values: []any{count}}
}

// ---------------------------------------------------------------------------
// COALESCE(SUM(...), 0)
// ---------------------------------------------------------------------------

func (q *mongoQuerier) queryRowCoalesceSum(ctx context.Context, p *parsedSQL) pgx.Row {
	coll := q.db.Collection(p.table)
	field := p.aggregateField

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: p.filter}},
		{{Key: "$group", Value: bson.M{"_id": nil, "total": bson.M{"$sum": "$" + field}}}},
		{{Key: "$project", Value: bson.M{"total": bson.M{"$ifNull": []any{"$total", 0}}}}},
	}

	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return &mongoRow{err: err}
	}
	defer cursor.Close(ctx)

	var result bson.M
	if !cursor.Next(ctx) {
		return &mongoRow{values: []any{int64(0)}}
	}
	if err := cursor.Decode(&result); err != nil {
		return &mongoRow{err: err}
	}
	v, _ := result["total"]
	return &mongoRow{values: []any{v}}
}

// ---------------------------------------------------------------------------
// MAX(version) for prompts
// ---------------------------------------------------------------------------

func (q *mongoQuerier) queryRowMaxVersion(ctx context.Context, p *parsedSQL) pgx.Row {
	coll := q.db.Collection(p.table)
	opts := options.FindOne().SetSort(bson.D{{Key: "version", Value: -1}})
	var doc bson.M
	err := coll.FindOne(ctx, p.filter, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return &mongoRow{values: []any{int64(0)}}
		}
		return &mongoRow{err: err}
	}
	v, _ := doc["version"]
	return &mongoRow{values: []any{v}}
}

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------

func (q *mongoQuerier) execInsert(ctx context.Context, p *parsedSQL) (pgconn.CommandTag, error) {
	coll := q.db.Collection(p.table)
	res, err := coll.InsertOne(ctx, p.doc)
	if err != nil {
		return pgconn.CommandTag{}, err
	}
	_ = res.InsertedID
	return pgconn.NewCommandTag(fmt.Sprintf("INSERT 0 1")), nil
}

func (q *mongoQuerier) queryRowInsert(ctx context.Context, p *parsedSQL) pgx.Row {
	coll := q.db.Collection(p.table)
	res, err := coll.InsertOne(ctx, p.doc)
	if err != nil {
		return &mongoRow{err: err}
	}
	_ = res.InsertedID
	return &mongoRow{values: extractValues(p.doc, p.returning)}
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

func (q *mongoQuerier) execUpdate(ctx context.Context, p *parsedSQL) (pgconn.CommandTag, error) {
	coll := q.db.Collection(p.table)
	updateDoc := bson.M{"$set": p.setDoc}
	res, err := coll.UpdateOne(ctx, p.filter, updateDoc)
	if err != nil {
		return pgconn.CommandTag{}, err
	}
	ra := int64(0)
	if res.ModifiedCount > 0 {
		ra = res.ModifiedCount
	} else if res.UpsertedCount > 0 {
		ra = res.UpsertedCount
	} else if res.MatchedCount > 0 {
		ra = res.MatchedCount
	}
	return pgconn.NewCommandTag(fmt.Sprintf("UPDATE %d", ra)), nil
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

func (q *mongoQuerier) execDelete(ctx context.Context, p *parsedSQL) (pgconn.CommandTag, error) {
	coll := q.db.Collection(p.table)
	res, err := coll.DeleteOne(ctx, p.filter)
	if err != nil {
		return pgconn.CommandTag{}, err
	}
	return pgconn.NewCommandTag(fmt.Sprintf("DELETE %d", res.DeletedCount)), nil
}

// ---------------------------------------------------------------------------
// Row / Rows implementations
// ---------------------------------------------------------------------------

type mongoRow struct {
	values []any
	err    error
}

func (r *mongoRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != len(r.values) {
		return fmt.Errorf("scan column count mismatch: got %d values for %d destinations", len(r.values), len(dest))
	}
	for i, v := range r.values {
		if err := scanAny(v, dest[i]); err != nil {
			return fmt.Errorf("scan column %d: %w", i, err)
		}
	}
	return nil
}

type mongoRows struct {
	docs  []bson.M
	cols  []string
	idx   int
	closed bool
	err   error
	tag   pgconn.CommandTag
}

func (r *mongoRows) Close() {
	r.closed = true
}

func (r *mongoRows) Err() error {
	return r.err
}

func (r *mongoRows) CommandTag() pgconn.CommandTag {
	return r.tag
}

func (r *mongoRows) FieldDescriptions() []pgconn.FieldDescription {
	return nil
}

func (r *mongoRows) Next() bool {
	if r.closed || r.err != nil {
		return false
	}
	r.idx++
	return r.idx <= len(r.docs)
}

func (r *mongoRows) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if r.idx < 1 || r.idx > len(r.docs) {
		return errors.New("no current row")
	}
	doc := r.docs[r.idx-1]
	values := extractValues(doc, r.cols)
	if len(values) != len(dest) {
		return fmt.Errorf("scan column count mismatch: got %d values for %d destinations", len(values), len(dest))
	}
	for i, v := range values {
		if err := scanAny(v, dest[i]); err != nil {
			return fmt.Errorf("scan column %d: %w", i, err)
		}
	}
	return nil
}

func (r *mongoRows) Values() ([]any, error) {
	if r.err != nil {
		return nil, r.err
	}
	if r.idx < 1 || r.idx > len(r.docs) {
		return nil, errors.New("no current row")
	}
	return extractValues(r.docs[r.idx-1], r.cols), nil
}

func (r *mongoRows) RawValues() [][]byte {
	return nil
}

func (r *mongoRows) Conn() *pgx.Conn {
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func extractValues(doc bson.M, cols []string) []any {
	values := make([]any, len(cols))
	for i, col := range cols {
		if v, ok := doc[col]; ok {
			values[i] = v
		} else {
			values[i] = nil
		}
	}
	return values
}

func scanAny(src, dst any) error {
	if src == nil {
		return nil
	}
	switch d := dst.(type) {
	case *string:
		switch s := src.(type) {
		case string:
			*d = s
		case bson.ObjectID:
			*d = s.Hex()
		default:
			*d = fmt.Sprintf("%v", src)
		}
	case *int:
		switch s := src.(type) {
		case int:
			*d = s
		case int32:
			*d = int(s)
		case int64:
			*d = int(s)
		case float64:
			*d = int(s)
		default:
			return fmt.Errorf("cannot scan %T into *int", src)
		}
	case *int64:
		switch s := src.(type) {
		case int64:
			*d = s
		case int32:
			*d = int64(s)
		case int:
			*d = int64(s)
		case float64:
			*d = int64(s)
		default:
			return fmt.Errorf("cannot scan %T into *int64", src)
		}
	case *float64:
		switch s := src.(type) {
		case float64:
			*d = s
		case int:
			*d = float64(s)
		case int64:
			*d = float64(s)
		case int32:
			*d = float64(s)
		default:
			return fmt.Errorf("cannot scan %T into *float64", src)
		}
	case *bool:
		switch s := src.(type) {
		case bool:
			*d = s
		default:
			return fmt.Errorf("cannot scan %T into *bool", src)
		}
	case *time.Time:
		switch s := src.(type) {
		case time.Time:
			*d = s
		case bson.DateTime:
			*d = s.Time()
		default:
			return fmt.Errorf("cannot scan %T into *time.Time", src)
		}
	case *[]string:
		switch s := src.(type) {
		case []string:
			*d = s
		case []any:
			arr := make([]string, len(s))
			for i, v := range s {
				arr[i] = fmt.Sprintf("%v", v)
			}
			*d = arr
		case bson.A:
			arr := make([]string, len(s))
			for i, v := range s {
				arr[i] = fmt.Sprintf("%v", v)
			}
			*d = arr
		default:
			return fmt.Errorf("cannot scan %T into *[]string", src)
		}
	default:
		// For pointer to pointer (nullable types)
		return fmt.Errorf("unsupported scan destination type %T", dst)
	}
	return nil
}

// ---------------------------------------------------------------------------
// SQL parser
// ---------------------------------------------------------------------------

type parsedSQL struct {
	kind           string
	table          string
	columns        []string
	returning      []string
	filter         bson.M
	setDoc         bson.M
	doc            bson.M
	limit          int64
	offset         int64
	orderBy        string
	orderDesc      bool
	aggregateField string
}

func parseSQL(sql string, args []any) (*parsedSQL, error) {
	clean := normalizeSQL(sql)
	p := &parsedSQL{filter: bson.M{}}

	// COALESCE(SUM(...), 0)
	if matchCoalesceSum(clean, p, args) {
		return p, nil
	}

	// COUNT(*)
	if matchCount(clean, p, args) {
		return p, nil
	}

	// SELECT
	if matchSelect(clean, p, args) {
		return p, nil
	}

	// INSERT
	if matchInsert(clean, p, args) {
		return p, nil
	}

	// UPDATE
	if matchUpdate(clean, p, args) {
		return p, nil
	}

	// DELETE
	if matchDelete(clean, p, args) {
		return p, nil
	}

	// MAX(version) pattern used by prompts
	if matchMaxVersion(clean, p, args) {
		return p, nil
	}

	return nil, fmt.Errorf("%w: unable to parse SQL: %s", errUnsupportedQuery, sql)
}

func normalizeSQL(sql string) string {
	// Replace newlines and extra spaces with single space
	sql = strings.Join(strings.Fields(sql), " ")

	// Lowercase everything except content inside single quotes
	var b strings.Builder
	b.Grow(len(sql))
	inQuote := false
	for _, r := range sql {
		if r == '\'' {
			inQuote = !inQuote
			b.WriteRune(r)
		} else if inQuote {
			b.WriteRune(r)
		} else {
			b.WriteRune(unicode.ToLower(r))
		}
	}
	return b.String()
}

// matchSelect parses: SELECT cols FROM table [WHERE ...] [ORDER BY col [ASC|DESC]] [LIMIT $n] [OFFSET $n]
func matchSelect(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^select (.+?) from ([a-z_]+)(?:\s+as\s+\w+)?(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+([a-z_0-9.]+)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\$?\d+|[0-9]+))?(?:\s+offset\s+(\$?\d+|[0-9]+))?\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}

	p.kind = "select"
	p.columns = splitColumns(m[1])
	p.table = m[2]
	if m[3] != "" {
		p.filter = parseWhere(m[3], args)
	}
	if m[4] != "" {
		p.orderBy = strings.TrimPrefix(m[4], "u.") // handle u.created_at
		p.orderBy = strings.TrimPrefix(p.orderBy, "o.")
	}
	if m[5] == "desc" {
		p.orderDesc = true
	}
	if m[6] != "" {
		p.limit = parseLimitOffset(m[6], args)
	}
	if m[7] != "" {
		p.offset = parseLimitOffset(m[7], args)
	}
	return true
}

// matchCount parses: SELECT COUNT(*) FROM table [WHERE ...]
func matchCount(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^select count\(\*\) from ([a-z_]+)(?:\s+where\s+(.+?))?\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "count"
	p.table = m[1]
	if m[2] != "" {
		p.filter = parseWhere(m[2], args)
	}
	return true
}

// matchCoalesceSum parses: SELECT COALESCE(SUM(field), 0) FROM table [WHERE ...]
func matchCoalesceSum(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^select coalesce\(sum\(([a-z_]+)\),\s*0\) from ([a-z_]+)(?:\s+where\s+(.+?))?\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "coalesce_sum"
	p.aggregateField = m[1]
	p.table = m[2]
	if m[3] != "" {
		p.filter = parseWhere(m[3], args)
	}
	return true
}

// matchMaxVersion parses: SELECT COALESCE(MAX(version), 0) + 1 FROM table WHERE ...
func matchMaxVersion(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^select coalesce\(max\(([a-z_]+)\),\s*0\)\s*\+?\s*1? from ([a-z_]+)(?:\s+where\s+(.+?))?\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "max_version"
	p.table = m[2]
	if m[3] != "" {
		p.filter = parseWhere(m[3], args)
	}
	return true
}

// matchInsert parses: INSERT INTO table (cols) VALUES (placeholders) [RETURNING cols]
func matchInsert(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^insert into ([a-z_]+) \(([^)]+)\) values \(([^)]+)\)(?:\s+returning\s+(.+?))?\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "insert"
	p.table = m[1]
	cols := splitColumns(m[2])
	vals := splitColumns(m[3])
	p.doc = bson.M{}
	for i, col := range cols {
		if i < len(vals) && i < len(args) {
			p.doc[col] = args[i]
		}
	}
	if m[4] != "" {
		p.returning = splitColumns(m[4])
	}
	return true
}

// matchUpdate parses: UPDATE table SET col = $n [, col2 = $n2 ...] WHERE col = $n
func matchUpdate(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^update ([a-z_]+) set (.+?) where (.+?)\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "update"
	p.table = m[1]
	p.setDoc = bson.M{}

	// Parse SET assignments
	assignRe := regexp.MustCompile(`([a-z_]+)\s*=\s*(\$\d+)`)
	setMatches := assignRe.FindAllStringSubmatch(m[2], -1)
	if setMatches == nil {
		return false
	}
	for _, sm := range setMatches {
		idx := parsePlaceholderIndex(sm[2])
		if idx > 0 && idx <= len(args) {
			p.setDoc[sm[1]] = args[idx-1]
		}
	}

	p.filter = parseWhere(m[3], args)
	return true
}

// matchDelete parses: DELETE FROM table WHERE col = $n
func matchDelete(clean string, p *parsedSQL, args []any) bool {
	re := regexp.MustCompile(`^delete from ([a-z_]+) where (.+?)\s*$`)
	m := re.FindStringSubmatch(clean)
	if m == nil {
		return false
	}
	p.kind = "delete"
	p.table = m[1]
	p.filter = parseWhere(m[2], args)
	return true
}

// parseWhere converts simple WHERE clauses to a MongoDB filter.
func parseWhere(where string, args []any) bson.M {
	filter := bson.M{}
	// Handle AND conditions
	parts := strings.Split(where, " and ")
	argIdx := 0
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		// Check for IS NULL / IS NOT NULL
		if strings.Contains(part, " is null") {
			col := strings.TrimSpace(strings.Split(part, " is null")[0])
			filter[col] = bson.M{"$exists": false}
			continue
		}
		if strings.Contains(part, " is not null") {
			col := strings.TrimSpace(strings.Split(part, " is not null")[0])
			filter[col] = bson.M{"$exists": true}
			continue
		}
		// Check for >=, <=, >, <, <>
		for _, op := range []string{">=", "<=", "<>", ">", "<", "="} {
			if strings.Contains(part, op) {
				sides := strings.SplitN(part, op, 2)
				if len(sides) == 2 {
					col := strings.TrimSpace(sides[0])
					valStr := strings.TrimSpace(sides[1])
					// Remove table alias prefix like u.status, o.id
					if idx := strings.Index(col, "."); idx != -1 {
						col = col[idx+1:]
					}
					var val any
					if isPlaceholder(valStr) {
						idx := parsePlaceholderIndex(valStr)
						if idx > 0 && idx <= len(args) {
							val = args[idx-1]
						} else if argIdx < len(args) {
							val = args[argIdx]
							argIdx++
						}
					} else if valStr == "now()" {
						val = time.Now()
					} else {
						val = unquote(valStr)
					}
					mongoOp := "$eq"
					switch op {
					case ">=":
						mongoOp = "$gte"
					case "<=":
						mongoOp = "$lte"
					case ">":
						mongoOp = "$gt"
					case "<":
						mongoOp = "$lt"
					case "<>":
						mongoOp = "$ne"
					}
					if existing, ok := filter[col]; ok && mongoOp != "$eq" {
						// Merge multiple conditions on same field
						if m, ok := existing.(bson.M); ok {
							m[mongoOp] = val
							filter[col] = m
						} else {
							filter[col] = bson.M{"$eq": existing, mongoOp: val}
						}
					} else {
						if mongoOp == "$eq" {
							filter[col] = val
						} else {
							filter[col] = bson.M{mongoOp: val}
						}
					}
				}
				break
			}
		}
	}
	return filter
}

func splitColumns(s string) []string {
	s = strings.TrimSpace(s)
	var cols []string
	for _, c := range strings.Split(s, ",") {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		// Strip COALESCE(..., '') wrapper
		if strings.HasPrefix(c, "coalesce(") {
			inner := c[len("coalesce("):]
			inner = strings.TrimSuffix(inner, ")")
			parts := strings.SplitN(inner, ",", 2)
			c = strings.TrimSpace(parts[0])
		}
		// Strip table alias prefix like u.id, o.name
		if idx := strings.Index(c, "."); idx != -1 {
			c = c[idx+1:]
		}
		cols = append(cols, c)
	}
	return cols
}

func isPlaceholder(s string) bool {
	return strings.HasPrefix(s, "$")
}

func parsePlaceholderIndex(s string) int {
	if !strings.HasPrefix(s, "$") {
		return 0
	}
	n, _ := strconv.Atoi(s[1:])
	return n
}

func parseLimitOffset(s string, args []any) int64 {
	if strings.HasPrefix(s, "$") {
		idx := parsePlaceholderIndex(s)
		if idx > 0 && idx <= len(args) {
			switch v := args[idx-1].(type) {
			case int:
				return int64(v)
			case int64:
				return v
			case int32:
				return int64(v)
			}
		}
		return 0
	}
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}

func unquote(s string) string {
	s = strings.TrimSpace(s)
	if (strings.HasPrefix(s, "'") && strings.HasSuffix(s, "'")) ||
		(strings.HasPrefix(s, `"`) && strings.HasSuffix(s, `"`)) {
		return s[1 : len(s)-1]
	}
	return s
}
