import type { AppLocale } from "@/i18n/routing";

export const legalPageKeys = ["privacy", "terms", "cookies", "accessibility"] as const;

export type LegalPageKey = (typeof legalPageKeys)[number];

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalDocument = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

const pages: Record<LegalPageKey, Record<AppLocale, LegalDocument>> = {
  privacy: {
    en: {
      title: "Privacy Policy",
      updated: "Updated 4 November 2026",
      sections: [
        {
          heading: "Who we are",
          paragraphs: [
            "Mafateeh Group operates this store. The address, phone number, and email in the footer are the contact details for questions about this policy.",
            "This page explains what the store keeps when you browse, create an account, save a wishlist, write a review, or place an order.",
          ],
        },
        {
          heading: "Information we collect",
          paragraphs: [
            "An account can include your first name, last name, email address, phone number and country, and a profile photo if you choose to add one.",
            "Signing in and changing your email use a short confirmation code sent to the address you give us. The store keeps a protected record of that code until it expires or is used.",
            "We also keep the orders, wishlist, loyalty points, and reviews attached to your account. The cart is saved in this browser so the services you added are still there when you come back.",
          ],
        },
        {
          heading: "How we use it",
          paragraphs: [
            "We use this information to run your account, show your orders and wishlist, add loyalty points on a paid order, moderate reviews, send confirmation codes, and reply when you contact us.",
          ],
        },
        {
          heading: "Sharing",
          paragraphs: [
            "We do not sell personal information. Email for confirmation codes is sent through the mail service configured for this store. We may also disclose information when the law requires it.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Account and order records stay while the account is in use and for as long as the store needs them for its records. Confirmation codes expire after a short time. Signing out removes the sign-in cookie from this browser.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "From My Account you can update your name, phone, photo, and email. A new email replaces the old one only after you enter the code sent to that new address.",
            "To ask about the information we hold, use the email or phone number in the footer.",
          ],
        },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      updated: "آخر تحديث 4 تشرين الثاني 2026",
      sections: [
        {
          heading: "من نحن",
          paragraphs: [
            "تدير مجموعة مفاتيح هذا المتجر. العنوان ورقم الهاتف والبريد الإلكتروني في التذييل هي وسيلة التواصل لأي سؤال عن هذه السياسة.",
            "توضح هذه الصفحة ما يحتفظ به المتجر عندما تتصفح، أو تنشئ حسابًا، أو تحفظ قائمة أمنيات، أو تكتب تقييمًا، أو تقدّم طلبًا.",
          ],
        },
        {
          heading: "المعلومات التي نجمعها",
          paragraphs: [
            "قد يتضمن الحساب الاسم الأول واسم العائلة والبريد الإلكتروني ورقم الهاتف والدولة، وصورة للملف الشخصي إذا اخترت إضافتها.",
            "تسجيل الدخول وتغيير البريد الإلكتروني يستخدمان رمز تأكيد قصيرًا يُرسل إلى العنوان الذي تزودنا به. يحتفظ المتجر بسجل محمي لهذا الرمز إلى أن ينتهي أو يُستخدم.",
            "نحتفظ أيضًا بالطلبات وقائمة الأمنيات ونقاط الولاء والتقييمات المرتبطة بحسابك. تُحفظ السلة في هذا المتصفح حتى تبقى الخدمات التي أضفتها عند عودتك.",
          ],
        },
        {
          heading: "كيف نستخدمها",
          paragraphs: [
            "نستخدم هذه المعلومات لتشغيل حسابك، وعرض طلباتك وقائمة أمنياتك، وإضافة نقاط الولاء على الطلب المدفوع، ومراجعة التقييمات، وإرسال رموز التأكيد، والرد عند تواصلك معنا.",
          ],
        },
        {
          heading: "المشاركة",
          paragraphs: [
            "لا نبيع المعلومات الشخصية. تُرسل رسائل رموز التأكيد عبر خدمة البريد المعدة لهذا المتجر. قد نفصح عن المعلومات أيضًا عندما يوجب القانون ذلك.",
          ],
        },
        {
          heading: "مدة الاحتفاظ",
          paragraphs: [
            "تبقى سجلات الحساب والطلبات ما دام الحساب مستخدمًا وللمدة التي يحتاجها المتجر لسجلاته. تنتهي رموز التأكيد بعد وقت قصير. تسجيل الخروج يزيل ملف تعريف ارتباط تسجيل الدخول من هذا المتصفح.",
          ],
        },
        {
          heading: "خياراتك",
          paragraphs: [
            "من حسابي يمكنك تحديث الاسم والهاتف والصورة والبريد الإلكتروني. لا يحل البريد الجديد محل القديم إلا بعد إدخال الرمز المرسل إلى ذلك العنوان الجديد.",
            "للسؤال عن المعلومات التي نحتفظ بها، استخدم البريد الإلكتروني أو رقم الهاتف في التذييل.",
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms & Conditions",
      updated: "Updated 4 November 2026",
      sections: [
        {
          heading: "Using the store",
          paragraphs: [
            "These terms cover use of the Mafateeh services store. Creating an account or placing an order means you accept them.",
          ],
        },
        {
          heading: "Accounts",
          paragraphs: [
            "An account is used to save a wishlist, write a review, and complete an order. Keep the email address and phone number on the account accurate. You are responsible for activity on a browser where you are signed in.",
          ],
        },
        {
          heading: "Services",
          paragraphs: [
            "Each service page describes what is offered, the price, and any options. We may update a service, its price, or whether it is available. The description shown when the order is placed is the one that applies to that order.",
          ],
        },
        {
          heading: "Orders",
          paragraphs: [
            "Adding a service to the cart does not complete a purchase. An order is confirmed when the store accepts it and payment is recorded as paid. Loyalty points are added once for a paid order that moves to paid, processing, or completed.",
          ],
        },
        {
          heading: "Reviews",
          paragraphs: [
            "A review should describe your experience with the service. We may approve, reject, or remove a review. Approved reviews can appear on the service page.",
          ],
        },
        {
          heading: "Acceptable use",
          paragraphs: [
            "Do not misuse the store, try to open another customer's account, or submit unlawful content.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "We may update these terms. The date at the top of this page is the date of the current version. Questions can be sent to the contact details in the footer.",
          ],
        },
      ],
    },
    ar: {
      title: "الشروط والأحكام",
      updated: "آخر تحديث 4 تشرين الثاني 2026",
      sections: [
        {
          heading: "استخدام المتجر",
          paragraphs: [
            "تنظم هذه الشروط استخدام متجر خدمات مفاتيح. إنشاء حساب أو تقديم طلب يعني أنك تقبلها.",
          ],
        },
        {
          heading: "الحسابات",
          paragraphs: [
            "يُستخدم الحساب لحفظ قائمة الأمنيات وكتابة تقييم وإتمام الطلب. أبقِ البريد الإلكتروني ورقم الهاتف في الحساب صحيحين. أنت مسؤول عن النشاط في المتصفح الذي سجلت الدخول منه.",
          ],
        },
        {
          heading: "الخدمات",
          paragraphs: [
            "تصف صفحة كل خدمة ما يُقدَّم والسعر وأي خيارات. قد نحدّث الخدمة أو سعرها أو توافرها. الوصف الظاهر عند تقديم الطلب هو الوصف الذي يسري على ذلك الطلب.",
          ],
        },
        {
          heading: "الطلبات",
          paragraphs: [
            "إضافة خدمة إلى السلة لا تُتم الشراء. يُؤكد الطلب عندما يقبله المتجر وتُسجل دفعتُه على أنها مدفوعة. تُضاف نقاط الولاء مرة واحدة للطلب المدفوع عندما ينتقل إلى مدفوع أو قيد المعالجة أو مكتمل.",
          ],
        },
        {
          heading: "التقييمات",
          paragraphs: [
            "يجب أن يصف التقييم تجربتك مع الخدمة. يجوز لنا اعتماد التقييم أو رفضه أو إزالته. يمكن أن تظهر التقييمات المعتمدة في صفحة الخدمة.",
          ],
        },
        {
          heading: "الاستخدام المقبول",
          paragraphs: [
            "لا تُسئ استخدام المتجر، ولا تحاول فتح حساب عميل آخر، ولا ترسل محتوى غير قانوني.",
          ],
        },
        {
          heading: "التغييرات",
          paragraphs: [
            "قد نحدّث هذه الشروط. التاريخ أعلى هذه الصفحة هو تاريخ النسخة الحالية. يمكن إرسال الأسئلة إلى بيانات التواصل في التذييل.",
          ],
        },
      ],
    },
  },
  cookies: {
    en: {
      title: "Cookie Policy",
      updated: "Updated 4 November 2026",
      sections: [
        {
          heading: "What this page covers",
          paragraphs: [
            "This page describes the cookies and similar storage this store places in your browser. The store does not use advertising cookies.",
          ],
        },
        {
          heading: "Sign-in cookie",
          paragraphs: [
            "After you sign in, the store sets a cookie named mafateeh_customer_session. It keeps you signed in for 30 days. Page scripts cannot read it. Signing out removes it.",
          ],
        },
        {
          heading: "Cart storage",
          paragraphs: [
            "The cart is saved in this browser's local storage under the name mafateeh.cart. It stays on this device until you remove the items or clear the site's stored data. It is not shared with other websites.",
          ],
        },
        {
          heading: "Language",
          paragraphs: [
            "The language you are reading is part of the page address, such as /en or /ar. The store does not set a separate language cookie.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "Sign out to remove the sign-in cookie. You can also clear this site's cookies and stored data from your browser. If the sign-in cookie is blocked, the store cannot keep you signed in.",
          ],
        },
      ],
    },
    ar: {
      title: "سياسة ملفات تعريف الارتباط",
      updated: "آخر تحديث 4 تشرين الثاني 2026",
      sections: [
        {
          heading: "ما تغطيه هذه الصفحة",
          paragraphs: [
            "تصف هذه الصفحة ملفات تعريف الارتباط والتخزين المماثل الذي يضعه هذا المتجر في متصفحك. لا يستخدم المتجر ملفات تعريف ارتباط إعلانية.",
          ],
        },
        {
          heading: "ملف تسجيل الدخول",
          paragraphs: [
            "بعد تسجيل الدخول يضع المتجر ملف تعريف ارتباط باسم mafateeh_customer_session. يبقيك مسجل الدخول لمدة 30 يومًا. لا تستطيع سكربتات الصفحة قراءته. تسجيل الخروج يزيله.",
          ],
        },
        {
          heading: "تخزين السلة",
          paragraphs: [
            "تُحفظ السلة في التخزين المحلي لهذا المتصفح تحت الاسم mafateeh.cart. تبقى على هذا الجهاز إلى أن تزيل العناصر أو تمسح بيانات الموقع المخزنة. لا تُشارك مع مواقع أخرى.",
          ],
        },
        {
          heading: "اللغة",
          paragraphs: [
            "اللغة التي تقرأ بها جزء من عنوان الصفحة، مثل /en أو /ar. لا يضع المتجر ملف تعريف ارتباط منفصلًا للغة.",
          ],
        },
        {
          heading: "خياراتك",
          paragraphs: [
            "سجل الخروج لإزالة ملف تسجيل الدخول. يمكنك أيضًا مسح ملفات تعريف الارتباط وبيانات هذا الموقع المخزنة من متصفحك. إذا حُظر ملف تسجيل الدخول، لا يستطيع المتجر إبقاؤك مسجل الدخول.",
          ],
        },
      ],
    },
  },
  accessibility: {
    en: {
      title: "Accessibility",
      updated: "Updated 4 November 2026",
      sections: [
        {
          heading: "Our aim",
          paragraphs: [
            "We want this store to be usable with a keyboard, a screen reader, and in either English or Arabic.",
          ],
        },
        {
          heading: "What the store provides",
          paragraphs: [
            "The store is available in English and Arabic. Arabic pages are laid out from right to left.",
            "Buttons and links have names, including the cart, search, menu, and account controls. Text can be resized with the browser.",
            "Carousels pause when the pointer is over them, and they stay still when the device asks for reduced motion.",
          ],
        },
        {
          heading: "If something gets in the way",
          paragraphs: [
            "Contact us and tell us the page and what blocked you. We will look at it, and where we can we will offer another way to reach the service or your account.",
            "Use the email or phone number in the footer.",
          ],
        },
      ],
    },
    ar: {
      title: "إمكانية الوصول",
      updated: "آخر تحديث 4 تشرين الثاني 2026",
      sections: [
        {
          heading: "هدفنا",
          paragraphs: [
            "نريد أن يكون هذا المتجر قابلًا للاستخدام بلوحة المفاتيح وقارئ الشاشة، وبالعربية أو الإنجليزية.",
          ],
        },
        {
          heading: "ما يوفره المتجر",
          paragraphs: [
            "المتجر متاح بالعربية والإنجليزية. صفحات العربية تُعرض من اليمين إلى اليسار.",
            "للأزرار والروابط أسماء، ومنها السلة والبحث والقائمة وحساب المستخدم. يمكن تكبير النص من المتصفح.",
            "تتوقف العروض المتحركة عندما يكون المؤشر فوقها، وتبقى ثابتة عندما يطلب الجهاز تقليل الحركة.",
          ],
        },
        {
          heading: "إذا أعاقك شيء",
          paragraphs: [
            "تواصل معنا واذكر الصفحة وما الذي أعاقك. سنراجعه، وحيث نستطيع سنعرض طريقة أخرى للوصول إلى الخدمة أو إلى حسابك.",
            "استخدم البريد الإلكتروني أو رقم الهاتف في التذييل.",
          ],
        },
      ],
    },
  },
};

export function legalDocument(page: LegalPageKey, locale: AppLocale) {
  return pages[page][locale];
}
