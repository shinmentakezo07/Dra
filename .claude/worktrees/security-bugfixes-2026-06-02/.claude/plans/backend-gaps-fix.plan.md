# Plan: Fix All Backend Gaps

**Complexity**: Large
**Estimated files**: ~15 Go files, ~5 TS files

## Summary

Fix all identified backend gaps: unregistered handlers, missing endpoints, SDK type mismatches, missing service methods, and frontend SDK alignment.

## Patterns to Mirror

| Category         | Source                         | Pattern                                                   |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| Handler auth     | `handler/handler.go:369`       | `middleware.GetUser(r)` nil check                         |
| Handler response | `handler/handler.go:380`       | `response.OK` / `response.Created` / `response.Paginated` |
| Error handling   | `handler/handler.go:170`       | `response.JSON(w, err.Status, response.Body{...})`        |
| Service pattern  | `service/webhook.go:41`        | Validate → repo call → `domain.Wrap()`                    |
| Repo pattern     | `repository/fine_tuning.go:19` | SQL → Scan → domain struct                                |

## Tasks

### Phase 1: Register Unregistered Handlers

- `MyPermissions` → `GET /api/auth/permissions`
- `AdminListAdjustments` → `GET /api/admin/billing/adjustments`

### Phase 2: Missing Handler Endpoints

- `UpdateConversation` → `PUT /api/conversations/{id}`
- `ListBatchJobs` → `GET /api/batch`
- `CancelBatchJob` → `DELETE /api/batch/{id}`
- `ListWebhookDeliveries` → `GET /api/webhooks/{id}/deliveries`
- `DownloadExport` → `GET /api/exports/{id}/download`
- `UploadFineTuningDataset` → `POST /api/fine-tuning/datasets`
- `ListFineTuningDatasets` → `GET /api/fine-tuning/datasets`
- `DeleteFineTuningDataset` → `DELETE /api/fine-tuning/datasets/{id}`
- `UpdateKey` → `PUT /api/keys/{id}`
- `Logout` → `POST /auth/logout`
- `DeleteAccount` → `DELETE /api/account`

### Phase 3: Register All New Routes in main.go

### Phase 4: Service Layer Additions

- FineTuningService dataset methods
- APIKeyService Update method
- UserService DeleteAccount method
- ExportService GetDownloadPath

### Phase 5: Frontend SDK Alignment

- Fix type mismatches (Comparison, FineTuningJob, Webhook, UserCredits, ExportJob, BatchJob)
- Add missing SDK methods
- Fix auth path routing

### Phase 6: Validation

```bash
cd apps/backend && make build && make vet && make test
cd apps/web && npx tsc --noEmit
```

## Risks

| Risk                            | Likelihood | Mitigation                               |
| ------------------------------- | ---------- | ---------------------------------------- |
| Breaking existing routes        | Low        | Only adding, not modifying               |
| SDK type changes break frontend | Medium     | Keep optional fields backward-compatible |
| Export file path security       | Medium     | Validate ownership before serving        |

## Acceptance

- [ ] All unregistered handlers have routes
- [ ] All missing endpoints implemented
- [ ] SDK types match backend models
- [ ] SDK has methods for all new endpoints
- [ ] Backend builds cleanly
- [ ] Frontend type-checks cleanly
