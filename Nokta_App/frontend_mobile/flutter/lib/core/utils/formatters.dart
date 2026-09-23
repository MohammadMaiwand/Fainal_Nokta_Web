import 'package:intl/intl.dart';
import 'package:shamsi_date/shamsi_date.dart';

String formatCurrencyAfn(num amount, {String locale = 'en'}) {
  final formatter = NumberFormat.currency(
    locale: locale,
    symbol: '',
    decimalDigits: 0,
  );
  return '${formatter.format(amount)} AF';
}

String formatDisplayDate(
  DateTime? date, {
  bool useJalali = false,
  String locale = 'en',
}) {
  if (date == null) return '—';
  if (useJalali || locale.startsWith('fa') || locale.startsWith('ps')) {
    final j = Jalali.fromDateTime(date);
    return '${j.year}/${j.month.toString().padLeft(2, '0')}/${j.day.toString().padLeft(2, '0')}';
  }
  return DateFormat.yMMMd(locale).format(date);
}

String readLocalizedText(dynamic value, {String language = 'en'}) {
  if (value == null) return '';
  if (value is String) return value;
  if (value is Map) {
    final lang = language.split('-').first;
    final resolved = value[lang] ?? value['en'] ?? value['fa'] ?? value['ps'];
    if (resolved is String) return resolved;
    for (final entry in value.values) {
      if (entry is String && entry.isNotEmpty) return entry;
    }
  }
  return '$value';
}
