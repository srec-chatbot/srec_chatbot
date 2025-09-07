import { apiRequest } from "./queryClient";
import type { AuthResponse, LoginCredentials, InsertUser } from "@shared/schema";

export class AuthService {
  private static TOKEN_KEY = 'srec_auth_token';
  private static USER_KEY = 'srec_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getUser() {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setAuth(authResponse: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResponse.user));
  }

  static clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    const authResponse = await response.json();
    this.setAuth(authResponse);
    return authResponse;
  }

  static async register(userData: InsertUser): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    const authResponse = await response.json();
    this.setAuth(authResponse);
    return authResponse;
  }

  static async logout() {
    this.clearAuth();
  }

  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
