SALON NOSA × VELORA — Firebase Cloud Version

تم تحويل المشروع من localStorage فقط إلى Firebase Realtime Database مع الحفاظ على جميع الصفحات والوظائف الموجودة.

الملفات الأصلية محفوظة:
- index.html
- services.html
- products.html
- details.html
- admin.html
- style.css
- script.js
- README.txt
- assets/nosa-logo.jpg
- assets/nosa-hero.jpg
- assets/velora-logo.jpg

ملف جديد:
- firebase-config.js

ما تم تغييره:
1) نفس التصميم والصفحات والصور والوظائف بدون حذف.
2) البيانات أصبحت تُحفظ في Firebase Realtime Database.
3) أي إضافة/حذف/تعديل من لوحة الإدارة تُرسل إلى قاعدة البيانات السحابية.
4) الصفحات المفتوحة على أجهزة أو متصفحات أخرى تستقبل تحديثات Firebase مباشرة عبر Realtime stream.
5) الصور تظل مضغوطة كما في المشروع الأصلي، لكنها تُخزن داخل بيانات Realtime Database نفسها لتجنب الحاجة إلى Firebase Cloud Storage.
6) المشروع لا يحتاج Firebase SDK خارجي؛ يستخدم Firebase Realtime Database REST + Realtime streaming.
7) localStorage ما زال مستخدمًا كنسخة احتياطية/cache، وليس كمصدر البيانات الأساسي عندما تكون Firebase متاحة.
8) عند أول تشغيل، إذا كانت قاعدة Firebase فارغة، يتم نقل البيانات الموجودة محليًا إلى Firebase تلقائيًا.
9) بيانات الدخول الحالية محفوظة كما هي:
   Username: veloraadmin
   Password: velora150160

مهم جدًا:
- المشروع الحالي يستخدم Firebase Realtime Database في TEST MODE.
- TEST MODE مناسب للاختبار فقط. قبل نشر الموقع بشكل نهائي يجب تأمين Security Rules.
- لا تستخدم هذا الإصدار كحل أمني نهائي لحماية لوحة الإدارة؛ كلمة مرور الإدارة الحالية موجودة في JavaScript كما كانت في المشروع الأصلي. يمكن في الخطوة التالية تحويل الدخول إلى Firebase Authentication.
- Firebase Cloud Storage غير مستخدم هنا حتى يظل المشروع متوافقًا مع خطة Spark المجانية؛ حاليًا Cloud Storage يتطلب Blaze.

طريقة GitHub Pages:
1) فك ضغط الملف.
2) ارفع الملفات الموجودة داخل المجلد إلى Repository، وليس ملف ZIP نفسه.
3) يجب أن يكون index.html في جذر الـ Repository.
4) فعّل GitHub Pages من Settings > Pages.
5) اختَر Deploy from a branch ثم main و /root.
