import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '../../../core/models/hotel.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-review-list',
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './review-list.component.html',
  styleUrl: './review-list.component.scss'
})
export class ReviewListComponent {
  @Input() reviews: Review[] = [];
  @Input() loading = false;

  @Output() onEdit = new EventEmitter<Review>();
  @Output() onDelete = new EventEmitter<string>();

  showDeleteDialog = signal<boolean>(false);
  selectedReviewId = signal<string | null>(null);

  constructor(public authService: AuthService) {}

  canModifyReview(review: Review): boolean {
    const currentUser = this.authService.user();
    if (!currentUser) return false;

    return currentUser.id === review.userId || this.authService.isAdmin();
  }

  editReview(review: Review): void {
    this.onEdit.emit(review);
  }

  openDeleteDialog(reviewId: string): void {
    this.selectedReviewId.set(reviewId);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedReviewId.set(null);
  }

  confirmDelete(): void {
    const reviewId = this.selectedReviewId();
    if (reviewId) {
      this.onDelete.emit(reviewId);
      this.closeDeleteDialog();
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  isStarFilled(star: number, rating: number): boolean {
    return star <= Math.round(rating);
  }
}
