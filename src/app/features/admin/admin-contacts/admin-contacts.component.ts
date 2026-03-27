import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService, ContactMessage } from '../../../core/services/contact.service';
import { TableColumn, TableAction } from '../../../core/models';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-contacts',
  imports: [CommonModule, TableComponent, ConfirmationDialogComponent],
  templateUrl: './admin-contacts.component.html',
  styleUrl: './admin-contacts.component.scss'
})
export class AdminContactsComponent implements OnInit {
  messages = signal<ContactMessage[]>([]);
  loading = signal<boolean>(true);
  showDeleteDialog = signal<boolean>(false);
  selectedMessage = signal<ContactMessage | null>(null);
  expandedMessageId = signal<string | null>(null);

  columns: TableColumn<ContactMessage>[] = [
    {
      key: 'createdAt',
      label: 'Date',
      render: (msg: ContactMessage) => new Date(msg.createdAt).toLocaleDateString()
    },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'subject',
      label: 'Subject',
      render: (msg: ContactMessage) =>
        msg.subject.length > 40 ? msg.subject.substring(0, 40) + '...' : msg.subject
    },
    {
      key: 'status',
      label: 'Status',
      render: (msg: ContactMessage) => this.getStatusLabel(msg.status)
    }
  ];

  actions: TableAction<ContactMessage>[] = [
    {
      label: 'View',
      icon: '👁️',
      onClick: (msg: ContactMessage) => this.toggleExpand(msg),
      variant: 'primary'
    },
    {
      label: 'Mark Read',
      icon: '📖',
      onClick: (msg: ContactMessage) => this.markAs(msg, 'READ'),
      condition: (msg: ContactMessage) => msg.status === 'NEW'
    },
    {
      label: 'Resolve',
      icon: '✅',
      onClick: (msg: ContactMessage) => this.markAs(msg, 'RESOLVED'),
      condition: (msg: ContactMessage) => msg.status !== 'RESOLVED'
    },
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: (msg: ContactMessage) => this.openDeleteDialog(msg),
      variant: 'danger'
    }
  ];

  constructor(private contactService: ContactService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading.set(true);
    this.contactService.getContactMessages().subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading contact messages:', error);
        this.loading.set(false);
      }
    });
  }

  toggleExpand(msg: ContactMessage): void {
    if (this.expandedMessageId() === msg.id) {
      this.expandedMessageId.set(null);
    } else {
      this.expandedMessageId.set(msg.id);
      if (msg.status === 'NEW') {
        this.markAs(msg, 'READ');
      }
    }
  }

  markAs(msg: ContactMessage, status: ContactMessage['status']): void {
    this.contactService.updateMessageStatus(msg.id, status).subscribe({
      next: () => this.loadMessages(),
      error: (error) => console.error('Error updating status:', error)
    });
  }

  openDeleteDialog(msg: ContactMessage): void {
    this.selectedMessage.set(msg);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedMessage.set(null);
  }

  confirmDelete(): void {
    const msg = this.selectedMessage();
    if (msg) {
      this.contactService.deleteMessage(msg.id).subscribe({
        next: () => {
          this.loadMessages();
          this.closeDeleteDialog();
        },
        error: (error) => {
          console.error('Error deleting message:', error);
          this.closeDeleteDialog();
        }
      });
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'NEW': return '🔵 New';
      case 'READ': return '📖 Read';
      case 'RESOLVED': return '✅ Resolved';
      default: return status;
    }
  }

  getNewCount(): number {
    return this.messages().filter(m => m.status === 'NEW').length;
  }

  getResolvedCount(): number {
    return this.messages().filter(m => m.status === 'RESOLVED').length;
  }
}
