import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';
import { DownloadFilesService } from '../../../service/files.service';
import { UserService } from '../../../service/user.service';
import { EmojiPickerComponent } from '../../../shared/components/emoji-picker/emoji-picker.component';
import { SmallBtnComponent } from '../../../shared/components/buttons/small-btn/small-btn.component';
import { ChatService } from '../../../service/chat.service';
import { Router } from '@angular/router';
import { ChannelService } from '../../../service/channel.service';
import { ToggleBooleanService } from '../../../service/toggle-boolean.service';
import { User } from '../../../interface/user.interface';
import { MessageData } from '../../../interface/chat.interface';
import { TranslateModule } from '@ngx-translate/core';
import { Channel } from '../../../interface/channel.interface';
import { SharedService } from '../../../service/shared.service';

@Component({
  selector: 'app-chat-msg-box',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerComponent,
    EmojiPickerComponent,
    SmallBtnComponent,
    TranslateModule,
  ],
  templateUrl: './chat-msg-box.component.html',
  styleUrl: './chat-msg-box.component.scss',
})
export class ChatMsgBoxComponent {
  @Input() currentChannel: string = '';
  @Input() target: string = '';
  @Input() viewWidth: number = 0;
  @Output() newMsgEmitter: EventEmitter<boolean> = new EventEmitter<boolean>();
  @ViewChild('textarea') textAreaRef!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  hasFile: boolean = false;
  fileDataError: boolean = false;
  fileSizeError: boolean = false;
  currentFiles!: FileList;
  getFileIcons = [
    './assets/img/documentIcon.svg',
    './assets/img/imgIcon.svg',
    './assets/img/mp3Icon.svg',
    './assets/img/pdfIcon.svg',
    './assets/img/videoIcon.svg',
    null,
  ];
  textArea: string = '';
  isEmojiPickerVisible: boolean | undefined;
  currentChatValue: string = '';
  showTargetMember: boolean = true;
  showChannels: boolean = false;
  showUsers: boolean = false;
  openSmallWindow: boolean = false;

  constructor(
    private route: Router,
    public downloadFilesService: DownloadFilesService,
    private firestore: Firestore,
    public userService: UserService,
    private chatService: ChatService,
    public channelService: ChannelService,
    public toggleBoolean: ToggleBooleanService,
    private sharedService: SharedService
  ) {}

  RESPONSIVE_THRESHOLD_MOBILE = this.sharedService.RESPONSIVE_THRESHOLD_MOBILE;

  /**
   * Handles the output from the emoji picker.
   * @param $event The selected emoji.
   */
  emojiOutputEmitter($event: any) {
    this.addEmoji($event);
  }

  /**
   * Select Textarea at onload.
   */
  ngAfterViewInit() {
    if (
      this.viewWidth != 0 &&
      this.viewWidth >= this.RESPONSIVE_THRESHOLD_MOBILE
    ) {
      this.textAreaRef.nativeElement.select();
    }
  }

  handleFileInputClick() {
    if (this.downloadFilesService.uploadFiles.length < 1) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Handles file input change event.
   * @param event The file change event.
   */
  onFileChange(event: any) {
    if (this.downloadFilesService.uploadFiles.length < 1) {
      const file = event.target.files[0];
      const fileIcon = this.checkIcon({ type: file.type });
      const fileSize = this.checkFileSize(file.size);
      if (fileIcon !== null && fileIcon && fileSize) {
        this.fileDataError = false;
        this.fileSizeError = false;
        this.currentFiles = event.target.files;
        this.hasFile = this.currentFiles.length > 0;
        if (this.currentFiles) {
          for (let i = 0; i < this.currentFiles.length; i++) {
            const fileInfo = this.currentFiles[i];
            this.downloadFilesService.uploadFiles.push(fileInfo);
          }
        }
      } else if (fileIcon) {
        this.fileSizeError = true;
      } else {
        this.fileDataError = true;
      }
    }
  }

  checkFileSize(fileSize: number): boolean {
    const maxSizeInBytes = 1 * 1024 * 1024; // Maximum file size of 1 MB
    if (fileSize <= maxSizeInBytes) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks the file type and returns the corresponding icon.
   * Img (1): PNG, GIF, JPG, JPEG
   * Files (3): PDF
   * Files (0): DOC, DOCX
   * Audio (2): MP3, WAV
   * Video (4): MP4, WMV, AVI
   * @param fileInfo The file object.
   * @returns The file icon path.
   */
  checkIcon(fileInfo: { type: string }) {
    const fileTypeMap: Record<string, number> = {
      'audio/mpeg': 2,
      'audio/wav': 2,
      'image/jpg': 1,
      'image/jpeg': 1,
      'image/png': 1,
      'image/gif': 1,
      'application/pdf': 3,
      'application/msword': 0,
      'application/doc': 0,
      'application/ms-doc': 0,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 0,
      'video/mp4': 4,
      'video/x-ms-wmv': 4,
      'video/avi': 4,
    };
    return this.getFileIcons[fileTypeMap[fileInfo.type] ?? 5];
  }

  /**
   * Processes the file selection and checks whether file types and file sizes meet the requirements.
   * @param {Event} event - The file input change event that contains the uploaded files.
   */
  handleFileSelection(event: any) {
    const files = event.target.files;
    const maxSize = 1 * 1024 * 1024; // 3 MB in Bytes

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Prüfen der Dateigröße
      if (file.size > maxSize) {
        this.fileSizeError = false;
      }
      this.fileSizeError = true;
    }
  }

  /**
   * Deletes the selected file.
   * @param file The file to be deleted.
   */
  deleteFile(file: File) {
    const index = this.downloadFilesService.uploadFiles.indexOf(file);
    if (index !== -1) {
      this.downloadFilesService.uploadFiles.splice(index, 1);
      this.hasFile = this.downloadFilesService.uploadFiles.length > 0;
    }
  }

  /**
   * Opens the selected file in a new tab.
   * @param file The file to be opened.
   */
  showCurrentFile(file: File) {
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Adds the selected emoji to the message text area.
   * @param event The selected emoji.
   */
  public addEmoji(event: any) {
    this.textArea = `${this.textArea}${event}`;
    this.isEmojiPickerVisible = false;
  }

  /**
   * Toggles the visibility of the emoji picker.
   */
  toggleEmojiPicker() {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /**
   * Displays the list of target chat users.
   * @param event The event object.
   */
  targetChatUser(event: Event) {
    event.stopPropagation();
    this.toggleBoolean.selectUserInMsgBox =
      !this.toggleBoolean.selectUserInMsgBox;
  }

  /**
   * Appends the selected user's name to the message text area.
   * @param user The selected user.
   */
  chooseUser(user: User) {
    const userName = ` @${user.firstName} ${user.lastName} `;

    this.textArea += userName;
    this.toggleBoolean.selectUserInMsgBox = false;
  }

  /**
   * Sends a message when Enter key is pressed.
   * @param e The keyboard event.
   */
  sendMessageWithEnter(e: KeyboardEvent) {
    if (this.textArea.trim() !== '') {
      if (e.keyCode === 13) {
        this.sendMessage();
      }
    }
  }

  /**
   * Sends the message to the target channel.
   */
  async sendMessage() {
    if (this.currentChannel && this.textArea.trim() !== '') {
      const messageRef = collection(this.firestore, this.target);
      const messageData = this.checkCollection(this.target);
      if (messageData) {
        await addDoc(messageRef, messageData)
          .then((docRef) => {
            this.downloadFilesService.uploadAllFiles(docRef.id);
          })
          .catch((error) => {
            console.error('Error adding document: ', error);
          });
      } else {
        console.error('Invalid target:', this.target);
      }
    }
    this.forwardToChannel();
    this.resetValues();
    this.newMsgEmitter.emit(true);
  }

  /**
   * Checks the target collection and returns the message data.
   * @param target The target collection.
   * @returns The message data.
   */
  checkCollection(target: string): MessageData | null {
    let messageData: Partial<MessageData> = {
      message: this.textArea,
      publishedTimestamp: Math.floor(Date.now() / 1000),
      userId: this.userService.getCurrentUserId(),
      edited: false,
    };

    if (target === 'chats') {
      messageData.channelId = this.checkChannelId();
    } else if (target === 'chat-answers') {
      messageData.chatId = this.checkChatId();
    } else {
      console.error('Invalid target:', target);
      return null;
    }
    return messageData as MessageData;
  }

  /**
   * Checks
   * the channel ID based on the chat service.
   * @returns The channel ID.
   */
  checkChannelId() {
    if (this.chatService.getChannelId) {
      return this.chatService.getChannelId;
    } else if (this.chatService.getPrvChatId) {
      return this.chatService.getPrvChatId;
    } else if (
      this.currentChannel === 'searchBar' &&
      this.chatService.inputValue === ''
    ) {
      return '';
    }
    return this.currentChannel;
  }

  /**
   * Checks the chat ID based on the chat service.
   * @returns The chat ID.
   */
  checkChatId() {
    if (this.chatService.isSecondaryChatId) {
      return this.chatService.isSecondaryChatId;
    }
    return;
  }

  /**
   * Navigates to the target channel after sending the message.
   */
  forwardToChannel() {
    if (this.chatService.getChannelId || this.chatService.getPrvChatId) {
      this.route.navigateByUrl(`/main/${this.checkChannelId()}`);
    }
  }

  /**
   * Close popups by leaving with the mouse the chat-msg-box.
   */
  mouseLeave() {
    this.isEmojiPickerVisible = false;
    this.toggleBoolean.selectUserInMsgBox = false;
    this.openSmallWindow = false;
    this.showChannels = false;
    this.showUsers = false;
  }

  /**
   * Open channels or user window by pressing @ or #.
   */
  checkChannelAndUser(e: KeyboardEvent) {
    if (e.key === '#') {
      this.openSmallWindow = true;
      this.showChannels = true;
      this.showUsers = false;
    } else if (e.key === '@') {
      this.openSmallWindow = true;
      this.showChannels = false;
      this.showUsers = true;
    }
    if (e.key === 'Backspace') {
      this.openSmallWindow = false;
      this.showChannels = false;
      this.showUsers = false;
    }
  }

  /**
   * Checks if the current user has access to any channels.
   * @returns {Channel[]} Array of Channel objects that the user has access to.
   */
  checkIfUserHasAccessToChannel() {
    const isUserAChannelMember = this.channelService.allChannels.some(
      (channel) =>
        channel.addedUser.includes(this.userService.getCurrentUserId())
    );

    if (isUserAChannelMember) {
      return this.channelService.allChannels.filter((channel) =>
        channel.addedUser.includes(this.userService.getCurrentUserId())
      );
    }
    return [];
  }

  /**
   * Chooses an element and performs necessary actions based on its type.
   * @param {Channel | User} element - The element to choose.
   */
  chooseElement(element: Channel | User) {
    if ('firstName' in element) {
      this.textArea += `${element.firstName} ${element.lastName} `;
    } else {
      this.textArea += `${element.name} `;
    }
    this.showUsers = false;
    this.showChannels = false;
    this.openSmallWindow = false;
    this.textAreaRef.nativeElement.focus();
  }

  /**
   * Resets input values after sending the message.
   */
  resetValues() {
    this.textArea = '';
    this.downloadFilesService.uploadFiles = [];
    this.hasFile = false;
    this.chatService.inputValue = '';
    this.chatService.getChannelId = '';
    this.chatService.getPrvChatId = '';
  }
}
