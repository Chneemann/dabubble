import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DownloadFilesService } from '../../../../service/files.service';
import { OverlayService } from '../../../../service/overlay.service';
import { OverlayComponent } from '../../../../shared/components/overlay/overlay.component';
import { SharedService } from '../../../../service/shared.service';

@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [CommonModule, OverlayComponent],
  templateUrl: './attachments.component.html',
  styleUrl: './attachments.component.scss',
})
export class AttachmentsComponent {
  @Input() chatId: string = '';
  @Input() filePath: string = '';
  @Input() openOnSecondaryChat: boolean = false;
  @Input() viewWidth: number = 0;

  imgIsLoading = true;

  constructor(
    public downloadFilesService: DownloadFilesService,
    private overlayService: OverlayService,
    private sharedService: SharedService
  ) {}

  RESPONSIVE_THRESHOLD = this.sharedService.RESPONSIVE_THRESHOLD;

  onImageLoad() {
    this.imgIsLoading = false;
  }

  /**
   * Gets the file type from the given file name.
   * @param {string} file - The name of the file.
   * @returns {string} The file type extracted from the file name.
   */
  getFileType(file: string): string {
    const extension = file.split('.').pop()?.toLowerCase();
    const getTag = extension!.split('?')[0];
    return getTag || '';
  }

  /**
   * Shows an overlay using the provided file name.
   * @param {string} file - The name of the file to display in the overlay.
   * @returns {void}
   */
  showOverlay(file: string) {
    this.overlayService.setOverlayData(file);
  }
}
