# Phase 3 Implementation: Admin Dashboard Tools

## Overview
Added two new admin features with full i18n support (English + Arabic):
1. Export Data capability (CSV export for Orders & Users tables)
2. Bulk Actions for order status management

---

## Core Rule Compliance
All new UI text and backend response messages support both **English** and **Arabic** via the existing i18n system (`useTranslation` hook + `uiPhrasePairs` dictionary).

### New i18n Keys Added
| Key | English | Arabic |
|-----|---------|--------|
| `common.export` | Export CSV | تصدير CSV |
| `common.exportAll` | Export All | تصدير الكل |
| `common.exportPage` | Export This Page | تصدير الصفحة |
| `admin.users.exportUsers` | Export Users | تصدير المستخدمين |
| `admin.users.exportSuccess` | Users exported | تم تصدير المستخدمين |
| `admin.users.bulkStatus` | Bulk Status Change | تغيير الحالة الجماعي |
| `admin.users.selectStatus` | Select new status | اختر الحالة الجديدة |
| `admin.users.appliedTo` | Applied to: {count} | تطبيق على: {count} |
| `admin.users.details` | User Details | بيانات المستخدم |
| `admin.orders.exportOrders` | Export Orders | تصدير الطلبات |
| `admin.orders.bulkStatus` | Bulk Status Change | تغيير الحالة الجماعي |
| `admin.orders.selectStatus` | Select new status | اختر الحالة الجديدة |
| `admin.orders.bulkApply` | Apply to Selected | تطبيق على المحدد |
| `admin.orders.bulkSuccess` | Orders updated | تم تحدير الطلبات |
| `admin.orders.exportSuccess` | Orders exported | تم تصدير الطلبات |
| `admin.orders.headers.*` | Table headers | رؤوس الجدول |
| `admin.users.headers.*` | Table headers | رؤوس الجدول |

### New uiPhrasePairs (raw text translations)
- `Export CSV` / `تصدير CSV`
- `Export All` / `تصدير الكل`
- `Export This Page` / `تصدير الصفحة`
- `Select` / `اختيار`
- `Apply` / `تطبيق`
- `Bulk Status Change` / `تغيير الحالة الجماعي`
- `Applied to` / `تطبيق على`
- `Data exported successfully` / `تم تصدير البيانات بنجاح`
- `Orders updated successfully` / `تم تحديث الطلبات بنجاح`
- `Export Users` / `تصدير المستخدمين`
- `Export Orders` / `تصدير الطلبات`
- `Users exported` / `تم تصدير المستخدمين`
- `Orders exported` / `تم تصدير الطلبات`
- `Select new status` / `اختر الحالة الجديدة`

---

## Backend Changes (server.ts)

### CSV Export Endpoints

1. **`GET /api/admin/orders/export`** (POST endpoint with query params)
   - Rate limited by `adminLimiter`
   - Supports `?status=all|pending|completed|cancelled&query=...&page=1`
   - Returns CSV with columns: ID, User ID, Service, Quantity, Charge, Status, Created At
   - Sets `Content-Type: text/csv` and `Content-Disposition: attachment` headers

2. **`GET /api/admin/users/export`** (GET endpoint)
   - Rate limited by `adminLimiter`
   - Supports `?role=all|admin|client&status=active|suspended|banned&query=...`
   - Returns CSV with columns: ID, UID, Name, Email, Role, Status, Balance, Created At
   - Sets `Content-Type: text/csv` and `Content-Disposition: attachment` headers

### Bulk Status Update Endpoint

3. **`POST /api/admin/orders/bulk-status`**
   - Rate limited by `adminLimiter`
   - Request body: `{ ids: string[], status: 'pending'|'processing'|'completed'|'cancelled' }`
   - Updates multiple orders' status in a single batch operation
   - Creates notifications for each affected user
   - Returns `{ updated: { count }, notified: { count }, invalid: [ids] }`

---

## Frontend Changes

### AdminOrders.tsx (Complete Rewrite)

New features added:
- **Export button** with dropdown: Export All / Export This Page
- **Bulk selection** with checkbox (select all + individual)
- **Bulk status change** dropdown + apply button
- **Status filter** dropdown (All / Pending / Processing / etc.)
- All UI text uses `t()` i18n function with fallback to English

### AdminUsers.tsx (Complete Rewrite)

New features added:
- **Export button** with dropdown: Export All / Export This Page
- **Bulk selection** with checkbox
- **Bulk status change** dropdown (Active / Suspended / Banned)
- **Status filter** dropdown
- **Balance modal** for adjusting user balance
- All UI text uses `t()` i18n function with fallback to English

---

## Files Modified
- `server.ts` — Added 3 new admin endpoints (2 export, 1 bulk)
- `src/lib/i18n.tsx` — Added 35+ new translation keys + uiPhrasePairs
- `src/pages/admin/AdminOrders.tsx` — Complete rewrite with export + bulk actions
- `src/pages/admin/AdminUsers.tsx` — Complete rewrite with export + bulk actions

---

## Verification
- `node --check server.ts` → passed (exit 0)
- i18n.tsx: No duplicate keys, balanced syntax
- AdminOrders.tsx: Balanced braces/brackets, valid JSX structure
- AdminUsers.tsx: Balanced syntax, valid JSX structure
