import api from "./api";

export const authService = {
  signup:        (data)          => api.post("/auth/signup", data),
  login:         (data)          => api.post("/auth/login", data),
  sendOTP:       (phone)         => api.post("/auth/send-otp", { phone }),
  verifyOTP:     (phone, otp)    => api.post("/auth/verify-otp", { phone, otp }),
  forgotPassword:(email)         => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }),
  changePassword:(data)          => api.post("/auth/change-password", data),
  refreshToken:  (refreshToken)  => api.post("/auth/refresh-token", { refreshToken }),
  verifyEmail:   (token)         => api.get(`/auth/verify-email?token=${token}`),
  getMe:         ()              => api.get("/auth/me"),
  googleLogin:   ()              => { window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/google`; },
};

export const userService = {
  getProfile:    ()              => api.get("/users/profile"),
  updateProfile: (data)          => api.put("/users/profile", data),
  uploadAvatar:  (formData)      => api.post("/users/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getHistory:    ()              => api.get("/users/search-history"),
  clearHistory:  ()              => api.delete("/users/search-history"),
  deleteAccount: ()              => api.delete("/users/account"),
};

export const favoriteService = {
  getAll:         ()             => api.get("/favorites"),
  add:            (productId, targetPrice) => api.post("/favorites", { productId, targetPrice }),
  remove:         (productId)    => api.delete(`/favorites/${productId}`),
  setTargetPrice: (productId, targetPrice) => api.patch(`/favorites/${productId}/target-price`, { targetPrice }),
};

export const notificationService = {
  getAll:   (params)  => api.get("/notifications", { params }),
  markRead: (id)      => api.patch(`/notifications/${id}/read`),
  markAllRead: ()     => api.patch("/notifications/read-all"),
  delete:   (id)      => api.delete(`/notifications/${id}`),
  deleteAll:()        => api.delete("/notifications"),
};
