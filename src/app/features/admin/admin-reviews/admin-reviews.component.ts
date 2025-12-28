import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../../core/services/review.service';
import { Review, TableColumn, TableAction } from '../../../core/models';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-reviews',
  imports: [CommonModule, TableComponent, ConfirmationDialogComponent],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.scss'
})
export class AdminReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  loading = signal<boolean>(true);
  showDeleteDialog = signal<boolean>(false);
  selectedReview = signal<Review | null>(null);

  columns: TableColumn<Review>[] = [
    { key: 'userName', label: 'User' },
    {
      key: 'hotelName',
      label: 'Hotel',
      render: (review: Review) => (review as any).hotel?.name || 'Unknown'
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: Review) => `${review.rating}/5 ⭐`
    },
    {
      key: 'comment',
      label: 'Review',
      render: (review: Review) =>
        review.comment
          ? review.comment.length > 100
            ? review.comment.substring(0, 100) + '...'
            : review.comment
          : 'No comment'
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (review: Review) => new Date(review.createdAt).toLocaleDateString()
    }
  ];

  actions: TableAction<Review>[] = [
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: (review: Review) => this.openDeleteDialog(review)
    }
  ];

  constructor(private reviewService: ReviewService) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.reviewService.getAllReviews().subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.loading.set(false);
      }
    });
  }

  openDeleteDialog(review: Review): void {
    this.selectedReview.set(review);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedReview.set(null);
  }

  confirmDelete(): void {
    const review = this.selectedReview();
    if (review) {
      this.reviewService.deleteReview(review.id).subscribe({
        next: () => {
          this.loadReviews();
          this.closeDeleteDialog();
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.closeDeleteDialog();
        }
      });
    }
  }

  getAverageRating(): string {
    const reviewsList = this.reviews();
    if (reviewsList.length === 0) {
      return '0';
    }
    const sum = reviewsList.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / reviewsList.length;
    return average.toFixed(1);
  }
}
