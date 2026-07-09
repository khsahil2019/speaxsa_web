import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({required this.message, this.statusCode, this.data});

  factory ApiException.fromDioError(DioException dioException) {
    switch (dioException.type) {
      case DioExceptionType.cancel:
        return ApiException(message: "Request to API server was cancelled");
      case DioExceptionType.connectionTimeout:
        return ApiException(message: "Connection timeout with API server");
      case DioExceptionType.receiveTimeout:
        return ApiException(message: "Receive timeout in connection with API server");
      case DioExceptionType.sendTimeout:
        return ApiException(message: "Send timeout in connection with API server");
      case DioExceptionType.badResponse:
        final response = dioException.response;
        String errorMessage = "Received invalid status code: ${response?.statusCode}";
        if (response?.data != null && response?.data is Map) {
          errorMessage = response?.data['error'] ?? response?.data['message'] ?? errorMessage;
        }
        return ApiException(
          message: errorMessage,
          statusCode: response?.statusCode,
          data: response?.data,
        );
      case DioExceptionType.connectionError:
        final url = dioException.requestOptions.uri.toString();
        return ApiException(message: "Connection failed to: $url\nPlease make sure the server is running and your device is connected.");
      default:
        return ApiException(message: "Something went wrong. Please try again later.");
    }
  }

  @override
  String toString() => message;
}
