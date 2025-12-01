import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Hotel } from '../../../core/models';

@Component({
  selector: 'app-hotel-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './hotel-card.component.html',
  styleUrl: './hotel-card.component.scss'
})
export class HotelCardComponent {
  @Input({ required: true }) hotel!: Hotel;
}
