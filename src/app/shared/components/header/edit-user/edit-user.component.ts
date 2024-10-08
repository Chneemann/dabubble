import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EditUserDetailsComponent } from './edit-user-details/edit-user-details.component';
import { UserService } from '../../../../service/user.service';
import { TranslateModule } from '@ngx-translate/core';
import { SmallBtnComponent } from '../../buttons/small-btn/small-btn.component';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    CommonModule,
    EditUserDetailsComponent,
    TranslateModule,
    SmallBtnComponent,
  ],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss',
})
export class EditUserComponent {
  @Input() showCurrentProfile: boolean = false;
  @Output() testValueChange = new EventEmitter<boolean>();

  isOnline: boolean = true;
  openProfil: boolean = false;
  openEditUserValue: boolean = false;

  constructor(public userService: UserService) {}

  /** Opens the edit user section. */
  openEditUser() {
    this.openEditUserValue = true;
  }

  /** Closes the current profile. */
  closeCurrentProfile() {
    this.showCurrentProfile = false;
    this.testValueChange.emit(this.showCurrentProfile);
    this.openEditUserValue = false;
  }

  /**
   * Updates the close value.
   * @param value The value to update.
   */
  updateCloseValue(value: boolean) {
    this.showCurrentProfile = value;
    this.openEditUserValue = value;
  }
}
