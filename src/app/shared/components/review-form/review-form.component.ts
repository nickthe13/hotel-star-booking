import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Review } from '../../../core/models/hotel.model';

export interface ReviewFormData {
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-review-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.scss'
})
export class ReviewFormComponent implements OnInit {
  @Input() existingReview?: Review;
  @Input() hotelId!: string;
  @Input() submitButtonText = 'Submit Review';

  @Output() onSubmit = new EventEmitter<ReviewFormData>();
  @Output() onCancel = new EventEmitter<void>();

  reviewForm!: FormGroup;
  hoveredRating = signal<number>(0);
  submitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.reviewForm = this.fb.group({
      rating: [this.existingReview?.rating || 0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: [this.existingReview?.comment || '', [Validators.maxLength(1000)]]
    });
  }

  setRating(rating: number): void {
    this.reviewForm.patchValue({ rating });
  }

  hoverRating(rating: number): void {
    this.hoveredRating.set(rating);
  }

  clearHover(): void {
    this.hoveredRating.set(0);
  }

  getDisplayRating(star: number): boolean {
    const hovered = this.hoveredRating();
    const currentRating = this.reviewForm.get('rating')?.value || 0;

    if (hovered > 0) {
      return star <= hovered;
    }
    return star <= currentRating;
  }

  getFieldError(fieldName: string): string | null {
    const field = this.reviewForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return 'This field is required';
      }
      if (field.errors?.['min']) {
        return 'Please select a rating';
      }
      if (field.errors?.['max']) {
        return 'Invalid rating value';
      }
      if (field.errors?.['maxlength']) {
        return `Maximum ${field.errors?.['maxlength'].requiredLength} characters allowed`;
      }
    }
    return null;
  }

  handleSubmit(): void {
    if (this.reviewForm.valid && !this.submitting) {
      this.submitting = true;
      const formData: ReviewFormData = {
        rating: this.reviewForm.value.rating,
        comment: this.reviewForm.value.comment?.trim() || ''
      };
      this.onSubmit.emit(formData);
    } else {
      Object.keys(this.reviewForm.controls).forEach(key => {
        this.reviewForm.get(key)?.markAsTouched();
      });
    }
  }

  handleCancel(): void {
    this.onCancel.emit();
  }

  resetSubmitting(): void {
    this.submitting = false;
  }
}
