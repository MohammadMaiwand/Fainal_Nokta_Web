import 'package:flutter/material.dart';

abstract final class AppRadius {
  static const double card = 24;
  static const double button = 16;
  static const double chip = 12;
  static const double sheet = 28;

  static BorderRadius get cardBorder => BorderRadius.circular(card);
  static BorderRadius get buttonBorder => BorderRadius.circular(button);
}
