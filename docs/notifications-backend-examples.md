# Notifications backend examples

This document contains short server-side examples (Spring Boot) for sending notifications to clients via STOMP (WebSocket + SockJS), Server-Sent Events (SSE), and raw WebSocket push. Use the payload format described below so the frontend `NotificationProvider` can consume messages.

Recommended message format (JSON):

- New notification:
  ```json
  { "type": "notification", "data": { "id": 123, "title": "You were assigned", "message": "Task XYZ", "actorName": "Minh", "actorAvatar": "...", "createdAt": "2025-11-04T09:00:00Z", "read": false } }
  ```
- Unread count update:
  ```json
  { "type": "unread-count", "data": 5 }
  ```
- Request client refresh:
  ```json
  { "type": "refresh" }
  ```

---

## A. STOMP (Spring WebSocket + STOMP)

1. WebSocket configuration (Spring Boot):

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setUserDestinationPrefix("/user");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```

2. Send message to specific user (server-side):

```java
@Autowired
private SimpMessagingTemplate messagingTemplate;

public void sendToUser(String username, Object payload) {
    // destination: /user/{username}/queue/notifications -> client subscribes to /user/queue/notifications
    messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
}
```

3. From your service when a task is assigned:

```java
Map<String,Object> msg = Map.of("type", "notification", "data", notificationDto);
sendToUser("minh", msg);
```

Notes:
- The frontend's default subscription destination is `/user/queue/notifications`. You can change it via `VITE_NOTIFICATION_STOMP_DEST`.
- If you use SockJS, the STOMP URL for the frontend is `/ws` (or full URL `https://api.example.com/ws`). The frontend provider will attach Authorization header when connecting (if token present).

---

## B. SSE (Server-Sent Events)

1. A simple SSE controller that supports per-user streams:

```java
@RestController
@RequestMapping("/api/v1/auth/notifications")
public class NotificationSseController {
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    @GetMapping("/stream")
    public SseEmitter streamNotifications(Principal principal) {
        String username = principal.getName();
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitters.put(username, emitter);
        emitter.onCompletion(() -> emitters.remove(username));
        emitter.onTimeout(() -> emitters.remove(username));
        return emitter;
    }

    public void sendToUser(String username, Object payload) {
        SseEmitter emitter = emitters.get(username);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().data(payload).reconnectTime(3000));
            } catch (IOException e) {
                emitters.remove(username);
            }
        }
    }
}
```

2. Frontend: connect to `/api/v1/auth/notifications/stream` (ensure authentication cookie or token is sent). You can send token in query string if needed.

---

## C. Raw WebSocket (server push without STOMP)

If you prefer raw WebSocket endpoints, implement a WebSocket handler and broadcast to connected sessions. Example (Spring):

```java
@Component
public class NotificationsWebSocketHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    public void sendToUser(String username, String payload) {
        // store mapping from username -> session attributes and find proper session
        for (WebSocketSession s : sessions) {
            if (username.equals(s.getAttributes().get("username"))) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }
}
```

---

## Auth considerations

- STOMP/SockJS: it's easiest to pass the Authorization header during STOMP connect; SimpMessaging will receive Principal if the handshake authenticates. Alternatively, accept token query param during the SockJS handshake and validate it server-side.
- SSE: browsers don't allow custom Authorization headers on EventSource; prefer cookie-based session auth, or let client append token as query param and validate manually.
- Raw WebSocket: you can authenticate during the handshake (HTTP upgrade) and set Principal on the session.

---

If you want, I can adapt any of these snippets to your exact backend stack (Spring Security config, token name, user id extraction, etc.).
