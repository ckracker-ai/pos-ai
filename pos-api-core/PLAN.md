# Plan: fix `ERROR_CREATING_CATEGORY`

## Information gathered
- `src/modules/catalog/routes/catalog.routes.ts` catches all errors for `POST /catalog/categoriesAction` and `POST /catalog/categories` and always returns `ERROR_CREATING_CATEGORY` with HTTP 400.
- `Category.model.ts` defines `name` as `allowNull: false` with a uniqueness constraint.
- `globalErrorHandler` already knows how to map Sequelize errors (UniqueConstraintError -> 409, ValidationError -> 422, ForeignKeyConstraintError -> 409, etc.).
- Therefore the root problem is likely not the Category model itself, but that the route handler is swallowing the real Sequelize error details.
- QA Postman payload for category creation uses `{ "name": "Categoria QA", "description": "..." }`.
- `authenticateToken` + `requireSeller` allow the request to reach the controller.

## Plan (file-level)
- `src/modules/catalog/routes/catalog.routes.ts`
  - For `POST /categoriesAction` and `POST /categories`, replace `catch { return sendFail(...); }` with `catch (err) { throw err; }` so that `globalErrorHandler` can produce the correct error (409/422/etc.) and not always mask it as 400.
  - Optionally add `console.error` inside catch before rethrowing for visibility.

## Dependent files to edit
- None (only `src/modules/catalog/routes/catalog.routes.ts`).

## Followup steps
1. Restart the API.
2. Call `POST /catalog/categories` (and `/categoriesAction`) using the existing Postman collection.
3. Confirm response changes from generic `ERROR_CREATING_CATEGORY` to the more accurate mapped Sequelize error (422/409) or success.

<ask_followup_question>
Confirm proceeding with: remove error swallowing for category creation routes in `src/modules/catalog/routes/catalog.routes.ts` so Sequelize errors are handled by `globalErrorHandler`.
</ask_followup_question>

