import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({required this.message, this.statusCode, this.data});

  factory ApiException.fromDioError(DioException dioException) {
    switch (dioException.type) {
      case DioExceptionType.cancel:
        return ApiException(message: "Request to server was cancelled");
      case DioExceptionType.connectionTimeout:
        return ApiException(message: "Connection timed out. Please check your internet connection.");
      case DioExceptionType.receiveTimeout:
        return ApiException(message: "Server response timed out. Please try again.");
      case DioExceptionType.sendTimeout:
        return ApiException(message: "Upload timed out. Please try again with a smaller file.");
      case DioExceptionType.badResponse:
        final response = dioException.response;
        final code = response?.statusCode;
        String errorMessage = "Received status code: $code";

        if (code == 413) {
          errorMessage = "File size is too large (max 5MB limit). Please choose a smaller photo or compress it.";
        } else if (code == 404) {
          errorMessage = "Requested item or endpoint was not found.";
        } else if (code == 401 || code == 403) {
          errorMessage = "Authentication failed or session expired. Please sign in again.";
        } else if (code == 500 || code == 502 || code == 503) {
          errorMessage = "Server is currently busy. Please try again in a moment.";
        } else if (response?.data != null && response?.data is Map) {
          errorMessage = response?.data['error'] ?? response?.data['message'] ?? response?.data['msg'] ?? errorMessage;
        }

        return ApiException(
          message: errorMessage,
          statusCode: code,
          data: response?.data,
        );
      case DioExceptionType.connectionError:
        return ApiException(message: "Network connection error. Please verify your Wi-Fi or mobile data.");
      default:
        return ApiException(message: "An unexpected error occurred. Please try again.");
    }
  }

  @override
  String toString() => message;
}
