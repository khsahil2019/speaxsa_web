import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_endpoints.dart';
import '../services/storage_service.dart';

class SocketService extends GetxService {
  static SocketService get to => Get.find<SocketService>();

  io.Socket? socket;
  final RxBool isConnected = false.obs;

  Future<SocketService> init() async {
    return this;
  }

  void connectSocket() async {
    final token = await StorageService.to.getToken();
    if (token == null || token.isEmpty) return;

    socket = io.io(
      ApiEndpoints.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket?.connect();

    socket?.onConnect((_) {
      isConnected.value = true;
      print('[Socket] Connected to server');
    });

    socket?.onDisconnect((_) {
      isConnected.value = false;
      print('[Socket] Disconnected from server');
    });

    socket?.onConnectError((err) {
      isConnected.value = false;
      print('[Socket] Connection Error: $err');
    });
  }

  void disconnectSocket() {
    socket?.disconnect();
    socket?.dispose();
    socket = null;
    isConnected.value = false;
  }

  void joinClassRoom(String classId) {
    if (socket?.connected == true) {
      socket?.emit('join-class', {'classId': classId});
    }
  }

  void sendChatMessage(String classId, String text) {
    if (socket?.connected == true) {
      socket?.emit('chat-message', {'classId': classId, 'text': text});
    }
  }

  void raiseHand(String classId) {
    if (socket?.connected == true) {
      socket?.emit('raise-hand', {'classId': classId});
    }
  }

  void onParticipantsUpdate(Function(List<dynamic>) callback) {
    socket?.on('participants-update', (data) {
      if (data is List) callback(data);
    });
  }

  void onChatMessage(Function(Map<String, dynamic>) callback) {
    socket?.on('chat-message', (data) {
      if (data is Map<String, dynamic>) callback(data);
    });
  }

  void onUserJoined(Function(Map<String, dynamic>) callback) {
    socket?.on('user-joined', (data) {
      if (data is Map<String, dynamic>) callback(data);
    });
  }

  void onUserLeft(Function(Map<String, dynamic>) callback) {
    socket?.on('user-left', (data) {
      if (data is Map<String, dynamic>) callback(data);
    });
  }

  void offClassEvents() {
    socket?.off('participants-update');
    socket?.off('chat-message');
    socket?.off('user-joined');
    socket?.off('user-left');
  }
}
