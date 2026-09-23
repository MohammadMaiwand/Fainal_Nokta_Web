/// Bundled public catalog used when API is unreachable (e.g. Flutter web CORS / offline).
abstract final class PublicFallbackData {
  static List<Map<String, dynamic>> classes(String lang) => [
        {
          'titleText': lang == 'fa'
              ? 'ریاضی پایه'
              : lang == 'ps'
                  ? 'اساسي ریاضي'
                  : 'Foundation Mathematics',
          'descriptionText': lang == 'fa'
              ? 'کلاس روزانه برای تقویت مبانی ریاضی.'
              : 'Daily class to strengthen math fundamentals.',
          'feeAmount': 1200,
          'registrationOpen': true,
        },
        {
          'titleText': lang == 'fa' ? 'انگلیسی عمومی' : 'General English',
          'descriptionText': lang == 'fa'
              ? 'مهارت گفتاری و نوشتاری برای همه سطوح.'
              : 'Speaking and writing for all levels.',
          'feeAmount': 900,
          'registrationOpen': true,
        },
        {
          'titleText': lang == 'fa' ? 'علوم تجربی' : 'Natural Sciences',
          'descriptionText': lang == 'fa'
              ? 'آزمایشگاه و تئوری برای صنوف متوسط.'
              : 'Lab and theory for middle grades.',
          'feeAmount': 1500,
          'registrationOpen': true,
        },
      ];

  static List<Map<String, dynamic>> courses(String lang) => [
        {
          'titleText': lang == 'fa' ? 'دوره برنامه‌نویسی' : 'Programming Bootcamp',
          'descriptionText': lang == 'fa'
              ? 'پروژه‌محور با مربیان باتجربه.'
              : 'Project-based learning with mentors.',
          'feeAmount': 2200,
          'registrationOpen': true,
        },
        {
          'titleText': lang == 'fa' ? 'دوره زبان انگلیسی' : 'English Intensive',
          'descriptionText': lang == 'fa'
              ? 'آمادگی آیلتس و مکالمه.'
              : 'IELTS prep and conversation.',
          'feeAmount': 1800,
          'registrationOpen': true,
        },
      ];

  static List<Map<String, dynamic>> announcements(String lang) => [
        {
          'title': lang == 'fa' ? 'ثبت‌نام باز است' : 'Registration open',
          'description': lang == 'fa'
              ? 'ظرفیت محدود برای کلاس‌های جدید.'
              : 'Limited seats for new classes.',
        },
        {
          'title': lang == 'fa' ? 'اعلان آکادمی' : 'Academy notice',
          'description': lang == 'fa'
              ? 'برنامه هفتگی در پنل دانش‌آموزان به‌روز شد.'
              : 'Weekly schedule updated in student portal.',
        },
      ];
}
