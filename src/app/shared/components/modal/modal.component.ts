import { Component, Input, Output, EventEmitter, ContentChild, ElementRef, AfterContentInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input({ required: true }) title!: string;
  @Input() isOpen: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() hideFooter: boolean = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  @ContentChild('[footer]', { read: ElementRef }) footerContent?: ElementRef;

  hasFooterContent = false;

  ngAfterContentInit(): void {
    this.hasFooterContent = !!this.footerContent;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      document.body.style.overflow = this.isOpen ? 'hidden' : '';
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  close(): void {
    this.onClose.emit();
  }

  confirm(): void {
    this.onConfirm.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
