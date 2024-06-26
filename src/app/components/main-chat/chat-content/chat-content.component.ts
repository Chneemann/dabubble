import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { MainChatComponent } from '../main-chat.component';
import { ChatService } from '../../../service/chat.service';
import { UserService } from '../../../service/user.service';
import { SingleChatComponent } from '../single-chat/single-chat.component';
import { ChatMsgBoxComponent } from '../chat-msg-box/chat-msg-box.component';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../../service/channel.service';
import { InfoComponent } from '../info/info.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-chat-content',
  standalone: true,
  imports: [
    MainChatComponent,
    SingleChatComponent,
    ChatMsgBoxComponent,
    CommonModule,
    InfoComponent,
  ],
  templateUrl: './chat-content.component.html',
  styleUrl: './chat-content.component.scss',
})
export class ChatContentComponent implements AfterViewInit {
  @Input() currentChannel: string = '';
  @Input() isPrivatChannel: boolean = false;
  @Input() isSearchChannel: boolean = false;
  @Input() hideContentWindow: boolean = false;
  @Input() viewWidth: number = 0;
  @Input() getChatChannel!: (currentChannel: string) => any;
  @Input() getChatUsers!: (currentChannel: string) => any;
  @ViewChild('messageBody') messageBody: ElementRef | undefined;
  filesLoaded: boolean = false;
  isNewMessage: boolean = false;

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    public channelService: ChannelService,
    private translateService: TranslateService,
    private renderer: Renderer2
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
  }

  /**
   * Updates the state of isNewMessage and optionally scrolls to the bottom.
   * @param {boolean} variable - The new value for isNewMessage.
   */
  editMsgEmitter(variable: boolean) {
    this.isNewMessage = variable;
    if (this.isNewMessage) {
      this.scrollToBottom();
    }
  }

  /**
   * Scrolls to the bottom of the message body element.
   */
  scrollToBottom(): void {
    if (this.messageBody) {
      const element = this.messageBody.nativeElement;
      this.renderer.setProperty(
        element,
        'scrollTop',
        element.scrollHeight - element.clientHeight
      );
    }
  }

  /**
   * Checks whether multiple chats have been posted for the date
   * @param {number} timestamp - The timestamp to be checked.
   * @returns {boolean} - Returns true or false.
   */
  isPublishedToday(timestamp: number) {
    return this.getAllChatsOnTheDate(this.currentChannel, timestamp).includes(
      timestamp
    );
  }

  /**
   * Retrieves timestamps of all chats posted on a specific date in a given channel.
   * @param {string} currentChannel - The current channel ID.
   * @param {number} timestamp - The timestamp representing the date.
   * @returns {number[]} An array of timestamps of messages.
   */
  getAllChatsOnTheDate(currentChannel: string, timestamp: number) {
    const todayDate = new Date(timestamp * 1000);
    const todayTimestamps = this.chatService.allChats
      .filter((chat) => chat.channelId === currentChannel)
      .filter((chat) => {
        const chatDate = new Date(chat.publishedTimestamp * 1000);
        return (
          chatDate.getFullYear() === todayDate.getFullYear() &&
          chatDate.getMonth() === todayDate.getMonth() &&
          chatDate.getDate() === todayDate.getDate()
        );
      })
      .map((chat) => chat.publishedTimestamp);

    todayTimestamps.shift();
    return todayTimestamps;
  }

  /**
   * Converts a timestamp to a formatted date string.
   * @param {number} timestamp - The timestamp to convert.
   * @returns {string} The formatted date string.
   */
  convertTimestampDate(timestamp: number): string {
    const currentDate = new Date();
    const inputDate = new Date(timestamp * 1000);
    const dayNumber = inputDate.getDate();

    const day = this.translateService.instant(
      `weekdays.${inputDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase()}`
    );
    const month = this.translateService.instant(
      `months.${inputDate
        .toLocaleDateString('en-US', { month: 'short' })
        .toLowerCase()}`
    );

    if (inputDate.toDateString() === currentDate.toDateString()) {
      return this.translateService.instant('weekdays.today');
    } else {
      return `${day}, ${dayNumber} ${month}`;
    }
  }
}
