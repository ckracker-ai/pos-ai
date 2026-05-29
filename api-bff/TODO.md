# TODO - Refactor BFF (Clean Architecture / SRP por dominio)

## Paso 1: Infraestructura de servicios por dominio
- [ ] Crear `src/services/apiCoreServiceInventory.ts` con métodos CRUD/lógica de Inventario:
  - getInventoryByBranch
  - getInventoryByBranchProduct
  - upsertStock
  - adjustStock
  - getLowStock

## Paso 2: Migración de routers que usan `CoreApiService`
- [ ] Actualizar `src/routes/inventory.ts` para usar `apiCoreServiceInventory` en lugar de `CoreApiService`
- [ ] Actualizar `src/routes/shrinkage.ts` para usar `apiCoreServiceShrinkage` (si el router aún usa `CoreApiService`)
- [ ] Actualizar `src/routes/products.ts` para eliminar dependencias de `ProductsService` y centralizar en `apiCoreServiceProduct` (+ inventario/shrinkage por dominio)
- [ ] Actualizar `src/routes/branches.ts` para eliminar `BranchesService` y usar `apiCoreServiceBranch`
- [ ] Actualizar `src/routes/users.ts` para eliminar `UsersService` y usar `apiCoreServiceUser`
- [ ] Revisar `src/routes/sales.ts` para eliminar dependencia de `salesService.ts`/`CoreApiService` si existiera

## Paso 3: Eliminación total de servicios duplicados/intermediarios
- [ ] Borrar `src/services/coreApiService.ts` cuando ya no existan referencias
- [ ] Borrar `src/services/productsService.ts` cuando ya no existan referencias
- [ ] Borrar `src/services/branchesService.ts` cuando ya no existan referencias
- [ ] Borrar `src/services/usersService.ts` cuando ya no existan referencias
- [ ] Borrar `src/services/salesService.ts` cuando ya no existan referencias

## Paso 4: Verificación
- [ ] Ejecutar `npm run build`
- [ ] Ejecutar búsqueda para confirmar que no quedan imports a servicios eliminados

