package handler

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
)

const MaxUploadSize = 10 << 20

var supportedImageTypes = map[string]string{
	"image/png":  "png",
	"image/jpeg": "jpeg",
	"image/jpg":  "jpeg",
	"image/webp": "webp",
	"image/gif":  "gif",
}

type UploadedFile struct {
	ID         string `json:"id"`
	Filename   string `json:"filename"`
	MIMEType   string `json:"mime_type"`
	Size       int64  `json:"size"`
	DataURI    string `json:"data_uri"`
	StorageKey string `json:"storage_key,omitempty"`
}

func (h *Handler) UploadFiles(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxUploadSize)
	if err := r.ParseMultipartForm(MaxUploadSize); err != nil {
		response.Error(w, 400, "File too large or invalid form")
		return
	}
	defer r.MultipartForm.RemoveAll()

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		response.Error(w, 400, "No files provided")
		return
	}

	uploaded := make([]UploadedFile, 0)
	for _, header := range files {
		f, err := processUpload(header)
		if err != nil {
			logger.Warn("upload_processing_failed", "file", header.Filename, "error", err.Error())
			continue
		}

		if h.fileSvc != nil {
			record, dbErr := h.fileSvc.CreateFile(r.Context(), u.ID, f.Filename, f.MIMEType, f.StorageKey, f.Size)
			if dbErr != nil {
				logger.Warn("file_persist_failed", "file", header.Filename, "error", dbErr.Message)
			} else {
				f.ID = record.ID
			}
		}

		uploaded = append(uploaded, *f)
	}

	response.OK(w, map[string]interface{}{
		"files": uploaded,
		"count": len(uploaded),
	})
}

func (h *Handler) ListFiles(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	if h.fileSvc == nil {
		response.Error(w, 500, "File service not available")
		return
	}
	page, limit := parsePagination(r)
	files, total, appErr := h.fileSvc.ListFiles(r.Context(), u.ID, page, limit)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.Paginated(w, files, total, page, limit)
}

func processUpload(header *multipart.FileHeader) (*UploadedFile, error) {
	if header.Size > MaxUploadSize {
		return nil, fmt.Errorf("file exceeds maximum size")
	}

	file, err := header.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	contentType := http.DetectContentType(sniff[:n])

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}

	if _, ok := supportedImageTypes[contentType]; !ok {
		return nil, fmt.Errorf("unsupported file type: %s", contentType)
	}

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	baseName := sanitizeUploadFilename(header.Filename)
	ext := strings.ToLower(filepath.Ext(baseName))
	if ext == ".png" {
		contentType = "image/png"
	} else if ext == ".jpg" || ext == ".jpeg" {
		contentType = "image/jpeg"
	} else if ext == ".webp" {
		contentType = "image/webp"
	} else if ext == ".gif" {
		contentType = "image/gif"
	}

	objectID, err := randomStorageID()
	if err != nil {
		return nil, err
	}
	dataURI := fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data))
	storageKey := fmt.Sprintf("uploads/%s/%s%s", supportedImageTypes[contentType], objectID, ext)

	return &UploadedFile{
		Filename:   baseName,
		MIMEType:   contentType,
		Size:       header.Size,
		DataURI:    dataURI,
		StorageKey: storageKey,
	}, nil
}

func sanitizeUploadFilename(name string) string {
	base := filepath.Base(name)
	base = strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '.' || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, base)
	if base == "." || base == "" {
		return "upload"
	}
	return base
}

func randomStorageID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate storage id: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
