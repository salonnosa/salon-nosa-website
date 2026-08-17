SALON NOSA × VELORA — Catalog Version

التعديلات:
1) تم فصل الخدمات عن المنتجات:
   - services.html لخدمات Salon Nosa
   - products.html لمنتجات VELORA
2) كل خدمة تظهر كوحدة مستقلة، وتحتها مباشرة:
   - صور الخدمة
   - آراء العملاء/Screenshots
3) كل منتج يظهر بنفس الطريقة.
4) تم حذف اللوجوهات من شاشة لوحة الإدارة/الحساب.
5) خلفية Salon Nosa ما زالت موجودة في لوحة الإدارة.
6) إضافة الصور والآراء المتعددة من لوحة الإدارة كما هي.

الدخول:
Username: veloraadmin
Password: velora150160

FINAL FIX: Admin page is full-screen and Salon Nosa/VELORA logos are hidden from the admin account/page. Public display logos remain.

FINAL FIX 2:
- Removed Salon Nosa and VELORA logos from public display pages and admin.
- Kept the Salon Nosa hero/background image.
- Fixed the admin login HTML typo that prevented the login panel from being found by JavaScript.
- Admin credentials remain: veloraadmin / velora150160.

NEW FEATURE:
- Services can have multiple Before/After image pairs.
- In admin: choose a service, select multiple Before images and matching After images in one batch.
- Number of Before images must equal After images; images are paired by order.
- Public service page shows a professional Before/After comparison card for every pair.

LIVE UPDATE:
- After adding/editing/deleting catalog content in the admin, the public catalog updates its DOM immediately without a manual refresh.
- If the public page is open in another browser tab/window, the storage event triggers the update there too.

REAL-TIME FIX:
The public catalog now polls a lightweight timestamp in localStorage every 300ms in addition to storage/custom events. This is designed specifically to make updates appear immediately when testing as local file:// pages, without pressing Refresh.

FIXED BEFORE/AFTER SERVICE SELECTOR:
- Newly added services now immediately appear in "صور قبل وبعد الخدمة > اختر الخدمة".
- The selector refreshes after adding a service and whenever the admin panel refreshes.
- Existing services are also loaded when the admin page opens.

FINAL BEFORE/AFTER DISPLAY FIX:
- Service detail pages now explicitly render all saved beforeAfter pairs.
- Existing old services are normalized so missing beforeAfter arrays do not break display.
- The public service page shows the Before/After section before the normal service gallery.

IMAGE DISPLAY FIX:
- Uploaded images are no longer forced into a fixed/cropped rectangle.
- Images keep their original proportions and the full image is visible.
- Before/After images also use contain instead of cover so important parts are not cut off.

MEDIUM IMAGE FIX:
- Images are now medium-sized rather than huge.
- Desktop gallery uses compact cards up to about 280px.
- Mobile gallery uses two columns where practical and keeps images easy to view.
- Before/After cards are also medium-sized and responsive.
