import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn, TableAction } from '../../../core/models';

@Component({
  selector: 'app-table',
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent<T extends Record<string, any>> {
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input({ required: true }) data: T[] = [];
  @Input() actions: TableAction<T>[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No data available';

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sortedData = signal<T[]>([]);

  ngOnChanges(): void {
    this.sortedData.set([...this.data]);
  }

  onSort(column: TableColumn<T>): void {
    if (!column.sortable) return;

    const currentSort = this.sortColumn();
    const currentDirection = this.sortDirection();

    // Toggle direction if same column, otherwise reset to ascending
    if (currentSort === column.key) {
      this.sortDirection.set(currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column.key);
      this.sortDirection.set('asc');
    }

    this.applySorting();
  }

  private applySorting(): void {
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) {
      this.sortedData.set([...this.data]);
      return;
    }

    const sorted = [...this.data].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });

    this.sortedData.set(sorted);
  }

  getCellValue(item: T, column: TableColumn<T>): string {
    if (column.render) {
      return column.render(item);
    }
    return item[column.key]?.toString() || '';
  }

  shouldShowAction(item: T, action: TableAction<T>): boolean {
    if (action.condition) {
      return action.condition(item);
    }
    return true;
  }

  getActionClass(variant?: string): string {
    switch (variant) {
      case 'primary':
        return 'table-action--primary';
      case 'danger':
        return 'table-action--danger';
      case 'secondary':
      default:
        return 'table-action--secondary';
    }
  }

  getSortIcon(column: TableColumn<T>): string {
    if (!column.sortable) return '';

    const currentSort = this.sortColumn();
    if (currentSort !== column.key) return '↕';

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }
}
