import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getContactMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.API_URL}/contact/admin/messages`);
  }

  updateMessageStatus(id: string, status: ContactMessage['status']): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`${this.API_URL}/contact/admin/messages/${id}/status`, { status });
  }

  deleteMessage(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/contact/admin/messages/${id}`);
  }
}
