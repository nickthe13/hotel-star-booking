import { Directive, ElementRef, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input('appScrollReveal') variant: string = 'fade-up';
  @Input() revealDelay: number = 0;
  @Input() revealThreshold: number = 0.15;

  private observer: IntersectionObserver | null = null;

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement as HTMLElement;

    // Apply initial hidden state via CSS class
    element.classList.add('reveal-hidden', `reveal-${this.variant}`);

    // Set stagger delay as CSS variable
    if (this.revealDelay > 0) {
      element.style.transitionDelay = `${this.revealDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      },
      {
        threshold: this.revealThreshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
