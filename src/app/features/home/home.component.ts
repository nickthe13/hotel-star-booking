import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

interface StatCounter {
  target: number;
  current: number;
  suffix: string;
  label: string;
  prefix: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('statsSection') statsSection!: ElementRef;

  stats = signal<StatCounter[]>([
    { target: 500, current: 0, suffix: '+', label: 'Premium Hotels', prefix: '' },
    { target: 10000, current: 0, suffix: '+', label: 'Happy Bookings', prefix: '' },
    { target: 50, current: 0, suffix: '+', label: 'Countries', prefix: '' },
    { target: 4.8, current: 0, suffix: '', label: 'Average Rating', prefix: '' }
  ]);

  private statsAnimated = false;
  private statsObserver: IntersectionObserver | null = null;
  private animationFrameId: number | null = null;

  constructor(
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Observe stats section for counter animation
    setTimeout(() => this.observeStats(), 100);
  }

  ngOnDestroy(): void {
    this.statsObserver?.disconnect();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private observeStats(): void {
    if (!this.statsSection?.nativeElement) return;

    this.statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.statsAnimated) {
            this.statsAnimated = true;
            this.animateCounters();
            this.statsObserver?.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    this.statsObserver.observe(this.statsSection.nativeElement);
  }

  private animateCounters(): void {
    const duration = 2000;
    const startTime = performance.now();
    const currentStats = this.stats();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const updatedStats = currentStats.map(stat => ({
        ...stat,
        current: stat.target <= 10
          ? Math.round(eased * stat.target * 10) / 10
          : Math.round(eased * stat.target)
      }));

      this.stats.set(updatedStats);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  formatStatValue(stat: StatCounter): string {
    if (stat.target <= 10) {
      return stat.prefix + stat.current.toFixed(1) + stat.suffix;
    }
    if (stat.current >= 1000) {
      return stat.prefix + stat.current.toLocaleString() + stat.suffix;
    }
    return stat.prefix + stat.current + stat.suffix;
  }

  scrollToContent(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const statsEl = this.statsSection?.nativeElement;
    if (statsEl) {
      statsEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
