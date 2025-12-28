import { Component, Input, Output, EventEmitter, signal, ContentChild, ElementRef, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements AfterContentInit {
  @Input({ required: true }) title!: string;
  @Input() isOpen = signal<boolean>(false);
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  @ContentChild('[footer]', { read: ElementRef }) footerContent?: ElementRef;

  hasFooterContent = false;

  ngAfterContentInit(): void {
    this.hasFooterContent = !!this.footerContent;
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
