import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  setActiveChat,
  setMessagesForUser,
  selectActiveChatMessages,
  Message,
} from "./chatSlice";
import { useSocket } from "../../context/SocketContext";
import { PaperAirplaneIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface ChatUser {
  id: string;
  name: string;
  role: "student" | "teacher";
  isOnline: boolean;
}

const formatTime = (date: Date | string): string => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Chat = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const user = useAppSelector((state) => state.auth.user);

  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef(selectedUser); // Ref to hold the current selected user
  selectedUserRef.current = selectedUser;

  const messages = useAppSelector(selectActiveChatMessages);
  const unreadCounts = useAppSelector((state) => state.chat.unreadCounts);

  const handleSelectUser = (userToSelect: ChatUser) => {
    if (selectedUser?.id === userToSelect.id) return;
    setSelectedUser(userToSelect);
    dispatch(setActiveChat(userToSelect.id));
    socket?.emit("getMessages", { userId: userToSelect.id });
  };

  // Effect for setting up socket listeners. Runs only once.
  useEffect(() => {
    if (!socket || !user) return;

    const handleUsers = (usersList: ChatUser[]) => {
      if (!user) return;
      const filtered = usersList.filter((u) => u.id !== user.id);
      setUsers(filtered);
    };

    const handleHistory = (history: Message[]) => {
      // Use the ref to get the most up-to-date selectedUser
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser) {
        dispatch(
          setMessagesForUser({
            partnerId: currentSelectedUser.id,
            messages: history,
          }),
        );
      }
    };

    socket.on("users", handleUsers);
    socket.on("messages", handleHistory);

    return () => {
      socket.off("users", handleUsers);
      socket.off("messages", handleHistory);
    };
  }, [socket, user, dispatch]);

  // Effect for initially fetching the user list.
  useEffect(() => {
    if (socket) {
      socket.emit("getUsers");
    }
  }, [socket]);

  // Effect for scrolling to the bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;
    socket.emit("sendMessage", {
      content: newMessage,
      recipientId: selectedUser.id,
    });
    setNewMessage("");
  };

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-white/70 backdrop-blur flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {user.role === "teacher" ? t("chat.students") : t("chat.teachers")}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.map((userItem) => (
            <div
              key={userItem.id}
              className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedUser?.id === userItem.id ? "bg-blue-50" : ""}`}
              onClick={() => handleSelectUser(userItem)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className="relative">
                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                    {userItem.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white status-dot" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium truncate">
                      {userItem.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userItem.isOnline ? t("chat.online") : t("chat.offline")}
                    </p>
                  </div>
                </div>
                {unreadCounts[userItem.id] > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs font-bold text-white rounded-full badge">
                    {unreadCounts[userItem.id]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b flex items-center">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="ml-3">
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedUser.isOnline ? t("chat.online") : t("chat.offline")}
                </p>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md px-4 py-2 rounded-lg ${msg.senderId === user.id ? "brand-bg text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border"}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 text-right ${msg.senderId === user.id ? "text-indigo-200" : "text-gray-500"}`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("chat.writeMessage")}
                  className="input flex-1"
                  disabled={!socket?.connected}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !socket?.connected}
                  className="btn-primary disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>
              {users.length > 0
                ? t("chat.selectInterlocutor")
                : t("chat.noInterlocutors")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
