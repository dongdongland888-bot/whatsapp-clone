<template>
  <div class="emoji-picker-container">
    <!-- 触发按钮 -->
    <button 
      class="emoji-trigger"
      @click="togglePicker"
      ref="triggerRef"
      title="Emoji"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>
    </button>

    <!-- Emoji 选择器面板 -->
    <transition name="slide-up">
      <div 
        v-if="showPicker" 
        class="emoji-picker"
        ref="pickerRef"
      >
        <!-- 搜索框 -->
        <div class="picker-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search emoji"
            ref="searchInput"
          />
        </div>

        <!-- 分类标签 -->
        <div class="picker-categories">
          <button
            v-for="category in categories"
            :key="category.id"
            :class="['category-btn', { active: activeCategory === category.id }]"
            @click="scrollToCategory(category.id)"
            :title="category.name"
          >
            <span>{{ category.icon }}</span>
          </button>
        </div>

        <!-- Emoji 列表 -->
        <div class="picker-content" ref="contentRef" @scroll="handleScroll">
          <!-- 搜索结果 -->
          <div v-if="searchQuery" class="search-results">
            <div v-if="filteredEmojis.length === 0" class="no-results">
              No emoji found
            </div>
            <div v-else class="emoji-grid">
              <button
                v-for="emoji in filteredEmojis"
                :key="emoji.emoji"
                class="emoji-btn"
                @click="selectEmoji(emoji)"
                :title="emoji.name"
              >
                {{ emoji.emoji }}
              </button>
            </div>
          </div>

          <!-- 分类列表 -->
          <template v-else>
            <!-- 最近使用 -->
            <div v-if="recentEmojis.length > 0" class="emoji-category" :id="'category-recent'">
              <h4 class="category-title">Recently Used</h4>
              <div class="emoji-grid">
                <button
                  v-for="emoji in recentEmojis"
                  :key="emoji.emoji"
                  class="emoji-btn"
                  @click="selectEmoji(emoji)"
                  :title="emoji.name"
                >
                  {{ emoji.emoji }}
                </button>
              </div>
            </div>

            <!-- 其他分类 -->
            <div 
              v-for="category in categories"
              :key="category.id"
              class="emoji-category"
              :id="'category-' + category.id"
            >
              <h4 class="category-title">{{ category.name }}</h4>
              <div class="emoji-grid">
                <button
                  v-for="emoji in getEmojisByCategory(category.id)"
                  :key="emoji.emoji"
                  class="emoji-btn"
                  @click="selectEmoji(emoji)"
                  :title="emoji.name"
                >
                  {{ emoji.emoji }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- 肤色选择器 -->
        <div v-if="showSkinTones" class="skin-tone-picker">
          <button
            v-for="tone in skinTones"
            :key="tone.id"
            :class="['skin-tone-btn', { active: selectedSkinTone === tone.id }]"
            @click="selectSkinTone(tone.id)"
            :title="tone.name"
          >
            <span :style="{ color: tone.color }">✋</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

// Emoji 数据
const emojiData = {
  smileys: [
    { emoji: '😀', name: 'grinning face' },
    { emoji: '😃', name: 'grinning face with big eyes' },
    { emoji: '😄', name: 'grinning face with smiling eyes' },
    { emoji: '😁', name: 'beaming face with smiling eyes' },
    { emoji: '😆', name: 'grinning squinting face' },
    { emoji: '😅', name: 'grinning face with sweat' },
    { emoji: '🤣', name: 'rolling on the floor laughing' },
    { emoji: '😂', name: 'face with tears of joy' },
    { emoji: '🙂', name: 'slightly smiling face' },
    { emoji: '🙃', name: 'upside-down face' },
    { emoji: '😉', name: 'winking face' },
    { emoji: '😊', name: 'smiling face with smiling eyes' },
    { emoji: '😇', name: 'smiling face with halo' },
    { emoji: '🥰', name: 'smiling face with hearts' },
    { emoji: '😍', name: 'smiling face with heart-eyes' },
    { emoji: '🤩', name: 'star-struck' },
    { emoji: '😘', name: 'face blowing a kiss' },
    { emoji: '😗', name: 'kissing face' },
    { emoji: '😚', name: 'kissing face with closed eyes' },
    { emoji: '😙', name: 'kissing face with smiling eyes' },
    { emoji: '🥲', name: 'smiling face with tear' },
    { emoji: '😋', name: 'face savoring food' },
    { emoji: '😛', name: 'face with tongue' },
    { emoji: '😜', name: 'winking face with tongue' },
    { emoji: '🤪', name: 'zany face' },
    { emoji: '😝', name: 'squinting face with tongue' },
    { emoji: '🤑', name: 'money-mouth face' },
    { emoji: '🤗', name: 'hugging face' },
    { emoji: '🤭', name: 'face with hand over mouth' },
    { emoji: '🤫', name: 'shushing face' },
    { emoji: '🤔', name: 'thinking face' },
    { emoji: '🤐', name: 'zipper-mouth face' },
    { emoji: '🤨', name: 'face with raised eyebrow' },
    { emoji: '😐', name: 'neutral face' },
    { emoji: '😑', name: 'expressionless face' },
    { emoji: '😶', name: 'face without mouth' },
    { emoji: '😏', name: 'smirking face' },
    { emoji: '😒', name: 'unamused face' },
    { emoji: '🙄', name: 'face with rolling eyes' },
    { emoji: '😬', name: 'grimacing face' },
    { emoji: '😮‍💨', name: 'face exhaling' },
    { emoji: '🤥', name: 'lying face' },
    { emoji: '😌', name: 'relieved face' },
    { emoji: '😔', name: 'pensive face' },
    { emoji: '😪', name: 'sleepy face' },
    { emoji: '🤤', name: 'drooling face' },
    { emoji: '😴', name: 'sleeping face' },
    { emoji: '😷', name: 'face with medical mask' },
    { emoji: '🤒', name: 'face with thermometer' },
    { emoji: '🤕', name: 'face with head-bandage' },
    { emoji: '🤢', name: 'nauseated face' },
    { emoji: '🤮', name: 'face vomiting' },
    { emoji: '🤧', name: 'sneezing face' },
    { emoji: '🥵', name: 'hot face' },
    { emoji: '🥶', name: 'cold face' },
    { emoji: '🥴', name: 'woozy face' },
    { emoji: '😵', name: 'dizzy face' },
    { emoji: '🤯', name: 'exploding head' },
    { emoji: '🤠', name: 'cowboy hat face' },
    { emoji: '🥳', name: 'partying face' },
    { emoji: '🥸', name: 'disguised face' },
    { emoji: '😎', name: 'smiling face with sunglasses' },
    { emoji: '🤓', name: 'nerd face' },
    { emoji: '🧐', name: 'face with monocle' },
    { emoji: '😕', name: 'confused face' },
    { emoji: '😟', name: 'worried face' },
    { emoji: '🙁', name: 'slightly frowning face' },
    { emoji: '☹️', name: 'frowning face' },
    { emoji: '😮', name: 'face with open mouth' },
    { emoji: '😯', name: 'hushed face' },
    { emoji: '😲', name: 'astonished face' },
    { emoji: '😳', name: 'flushed face' },
    { emoji: '🥺', name: 'pleading face' },
    { emoji: '😦', name: 'frowning face with open mouth' },
    { emoji: '😧', name: 'anguished face' },
    { emoji: '😨', name: 'fearful face' },
    { emoji: '😰', name: 'anxious face with sweat' },
    { emoji: '😥', name: 'sad but relieved face' },
    { emoji: '😢', name: 'crying face' },
    { emoji: '😭', name: 'loudly crying face' },
    { emoji: '😱', name: 'face screaming in fear' },
    { emoji: '😖', name: 'confounded face' },
    { emoji: '😣', name: 'persevering face' },
    { emoji: '😞', name: 'disappointed face' },
    { emoji: '😓', name: 'downcast face with sweat' },
    { emoji: '😩', name: 'weary face' },
    { emoji: '😫', name: 'tired face' },
    { emoji: '🥱', name: 'yawning face' },
    { emoji: '😤', name: 'face with steam from nose' },
    { emoji: '😡', name: 'pouting face' },
    { emoji: '😠', name: 'angry face' },
    { emoji: '🤬', name: 'face with symbols on mouth' },
    { emoji: '😈', name: 'smiling face with horns' },
    { emoji: '👿', name: 'angry face with horns' },
    { emoji: '💀', name: 'skull' },
    { emoji: '☠️', name: 'skull and crossbones' },
    { emoji: '💩', name: 'pile of poo' },
    { emoji: '🤡', name: 'clown face' },
    { emoji: '👹', name: 'ogre' },
    { emoji: '👺', name: 'goblin' },
    { emoji: '👻', name: 'ghost' },
    { emoji: '👽', name: 'alien' },
    { emoji: '👾', name: 'alien monster' },
    { emoji: '🤖', name: 'robot' }
  ],
  gestures: [
    { emoji: '👋', name: 'waving hand' },
    { emoji: '🤚', name: 'raised back of hand' },
    { emoji: '🖐️', name: 'hand with fingers splayed' },
    { emoji: '✋', name: 'raised hand' },
    { emoji: '🖖', name: 'vulcan salute' },
    { emoji: '👌', name: 'OK hand' },
    { emoji: '🤌', name: 'pinched fingers' },
    { emoji: '🤏', name: 'pinching hand' },
    { emoji: '✌️', name: 'victory hand' },
    { emoji: '🤞', name: 'crossed fingers' },
    { emoji: '🤟', name: 'love-you gesture' },
    { emoji: '🤘', name: 'sign of the horns' },
    { emoji: '🤙', name: 'call me hand' },
    { emoji: '👈', name: 'backhand index pointing left' },
    { emoji: '👉', name: 'backhand index pointing right' },
    { emoji: '👆', name: 'backhand index pointing up' },
    { emoji: '🖕', name: 'middle finger' },
    { emoji: '👇', name: 'backhand index pointing down' },
    { emoji: '☝️', name: 'index pointing up' },
    { emoji: '👍', name: 'thumbs up' },
    { emoji: '👎', name: 'thumbs down' },
    { emoji: '✊', name: 'raised fist' },
    { emoji: '👊', name: 'oncoming fist' },
    { emoji: '🤛', name: 'left-facing fist' },
    { emoji: '🤜', name: 'right-facing fist' },
    { emoji: '👏', name: 'clapping hands' },
    { emoji: '🙌', name: 'raising hands' },
    { emoji: '👐', name: 'open hands' },
    { emoji: '🤲', name: 'palms up together' },
    { emoji: '🤝', name: 'handshake' },
    { emoji: '🙏', name: 'folded hands' },
    { emoji: '✍️', name: 'writing hand' },
    { emoji: '💅', name: 'nail polish' },
    { emoji: '🤳', name: 'selfie' },
    { emoji: '💪', name: 'flexed biceps' },
    { emoji: '🦾', name: 'mechanical arm' },
    { emoji: '🦿', name: 'mechanical leg' },
    { emoji: '🦵', name: 'leg' },
    { emoji: '🦶', name: 'foot' },
    { emoji: '👂', name: 'ear' },
    { emoji: '🦻', name: 'ear with hearing aid' },
    { emoji: '👃', name: 'nose' },
    { emoji: '🧠', name: 'brain' },
    { emoji: '🫀', name: 'anatomical heart' },
    { emoji: '🫁', name: 'lungs' },
    { emoji: '🦷', name: 'tooth' },
    { emoji: '🦴', name: 'bone' },
    { emoji: '👀', name: 'eyes' },
    { emoji: '👁️', name: 'eye' },
    { emoji: '👅', name: 'tongue' },
    { emoji: '👄', name: 'mouth' }
  ],
  hearts: [
    { emoji: '❤️', name: 'red heart' },
    { emoji: '🧡', name: 'orange heart' },
    { emoji: '💛', name: 'yellow heart' },
    { emoji: '💚', name: 'green heart' },
    { emoji: '💙', name: 'blue heart' },
    { emoji: '💜', name: 'purple heart' },
    { emoji: '🖤', name: 'black heart' },
    { emoji: '🤍', name: 'white heart' },
    { emoji: '🤎', name: 'brown heart' },
    { emoji: '💔', name: 'broken heart' },
    { emoji: '❣️', name: 'heart exclamation' },
    { emoji: '💕', name: 'two hearts' },
    { emoji: '💞', name: 'revolving hearts' },
    { emoji: '💓', name: 'beating heart' },
    { emoji: '💗', name: 'growing heart' },
    { emoji: '💖', name: 'sparkling heart' },
    { emoji: '💘', name: 'heart with arrow' },
    { emoji: '💝', name: 'heart with ribbon' },
    { emoji: '💟', name: 'heart decoration' },
    { emoji: '♥️', name: 'heart suit' },
    { emoji: '💌', name: 'love letter' },
    { emoji: '💋', name: 'kiss mark' },
    { emoji: '💯', name: 'hundred points' },
    { emoji: '💢', name: 'anger symbol' },
    { emoji: '💥', name: 'collision' },
    { emoji: '💫', name: 'dizzy' },
    { emoji: '💦', name: 'sweat droplets' },
    { emoji: '💨', name: 'dashing away' },
    { emoji: '🕳️', name: 'hole' },
    { emoji: '💣', name: 'bomb' },
    { emoji: '💬', name: 'speech balloon' },
    { emoji: '👁️‍🗨️', name: 'eye in speech bubble' },
    { emoji: '🗨️', name: 'left speech bubble' },
    { emoji: '🗯️', name: 'right anger bubble' },
    { emoji: '💭', name: 'thought balloon' },
    { emoji: '💤', name: 'zzz' }
  ],
  animals: [
    { emoji: '🐶', name: 'dog face' },
    { emoji: '🐱', name: 'cat face' },
    { emoji: '🐭', name: 'mouse face' },
    { emoji: '🐹', name: 'hamster' },
    { emoji: '🐰', name: 'rabbit face' },
    { emoji: '🦊', name: 'fox' },
    { emoji: '🐻', name: 'bear' },
    { emoji: '🐼', name: 'panda' },
    { emoji: '🐨', name: 'koala' },
    { emoji: '🐯', name: 'tiger face' },
    { emoji: '🦁', name: 'lion' },
    { emoji: '🐮', name: 'cow face' },
    { emoji: '🐷', name: 'pig face' },
    { emoji: '🐸', name: 'frog' },
    { emoji: '🐵', name: 'monkey face' },
    { emoji: '🙈', name: 'see-no-evil monkey' },
    { emoji: '🙉', name: 'hear-no-evil monkey' },
    { emoji: '🙊', name: 'speak-no-evil monkey' },
    { emoji: '🐒', name: 'monkey' },
    { emoji: '🐔', name: 'chicken' },
    { emoji: '🐧', name: 'penguin' },
    { emoji: '🐦', name: 'bird' },
    { emoji: '🐤', name: 'baby chick' },
    { emoji: '🦆', name: 'duck' },
    { emoji: '🦅', name: 'eagle' },
    { emoji: '🦉', name: 'owl' },
    { emoji: '🦇', name: 'bat' },
    { emoji: '🐺', name: 'wolf' },
    { emoji: '🐗', name: 'boar' },
    { emoji: '🐴', name: 'horse face' },
    { emoji: '🦄', name: 'unicorn' },
    { emoji: '🐝', name: 'honeybee' },
    { emoji: '🐛', name: 'bug' },
    { emoji: '🦋', name: 'butterfly' },
    { emoji: '🐌', name: 'snail' },
    { emoji: '🐞', name: 'lady beetle' },
    { emoji: '🐜', name: 'ant' },
    { emoji: '🦟', name: 'mosquito' },
    { emoji: '🦗', name: 'cricket' },
    { emoji: '🐢', name: 'turtle' },
    { emoji: '🐍', name: 'snake' },
    { emoji: '🦎', name: 'lizard' },
    { emoji: '🦖', name: 'T-Rex' },
    { emoji: '🦕', name: 'sauropod' },
    { emoji: '🐙', name: 'octopus' },
    { emoji: '🦑', name: 'squid' },
    { emoji: '🦐', name: 'shrimp' },
    { emoji: '🦞', name: 'lobster' },
    { emoji: '🦀', name: 'crab' },
    { emoji: '🐡', name: 'blowfish' },
    { emoji: '🐠', name: 'tropical fish' },
    { emoji: '🐟', name: 'fish' },
    { emoji: '🐬', name: 'dolphin' },
    { emoji: '🐳', name: 'spouting whale' },
    { emoji: '🐋', name: 'whale' },
    { emoji: '🦈', name: 'shark' }
  ],
  food: [
    { emoji: '🍎', name: 'red apple' },
    { emoji: '🍐', name: 'pear' },
    { emoji: '🍊', name: 'tangerine' },
    { emoji: '🍋', name: 'lemon' },
    { emoji: '🍌', name: 'banana' },
    { emoji: '🍉', name: 'watermelon' },
    { emoji: '🍇', name: 'grapes' },
    { emoji: '🍓', name: 'strawberry' },
    { emoji: '🫐', name: 'blueberries' },
    { emoji: '🍈', name: 'melon' },
    { emoji: '🍒', name: 'cherries' },
    { emoji: '🍑', name: 'peach' },
    { emoji: '🥭', name: 'mango' },
    { emoji: '🍍', name: 'pineapple' },
    { emoji: '🥥', name: 'coconut' },
    { emoji: '🥝', name: 'kiwi fruit' },
    { emoji: '🍅', name: 'tomato' },
    { emoji: '🥑', name: 'avocado' },
    { emoji: '🍆', name: 'eggplant' },
    { emoji: '🥔', name: 'potato' },
    { emoji: '🥕', name: 'carrot' },
    { emoji: '🌽', name: 'ear of corn' },
    { emoji: '🌶️', name: 'hot pepper' },
    { emoji: '🥒', name: 'cucumber' },
    { emoji: '🥬', name: 'leafy green' },
    { emoji: '🥦', name: 'broccoli' },
    { emoji: '🧄', name: 'garlic' },
    { emoji: '🧅', name: 'onion' },
    { emoji: '🍄', name: 'mushroom' },
    { emoji: '🥜', name: 'peanuts' },
    { emoji: '🌰', name: 'chestnut' },
    { emoji: '🍞', name: 'bread' },
    { emoji: '🥐', name: 'croissant' },
    { emoji: '🥖', name: 'baguette bread' },
    { emoji: '🥨', name: 'pretzel' },
    { emoji: '🧀', name: 'cheese wedge' },
    { emoji: '🥚', name: 'egg' },
    { emoji: '🍳', name: 'cooking' },
    { emoji: '🧈', name: 'butter' },
    { emoji: '🥞', name: 'pancakes' },
    { emoji: '🧇', name: 'waffle' },
    { emoji: '🥓', name: 'bacon' },
    { emoji: '🥩', name: 'cut of meat' },
    { emoji: '🍗', name: 'poultry leg' },
    { emoji: '🍖', name: 'meat on bone' },
    { emoji: '🌭', name: 'hot dog' },
    { emoji: '🍔', name: 'hamburger' },
    { emoji: '🍟', name: 'french fries' },
    { emoji: '🍕', name: 'pizza' },
    { emoji: '🥪', name: 'sandwich' },
    { emoji: '🌮', name: 'taco' },
    { emoji: '🌯', name: 'burrito' },
    { emoji: '🥗', name: 'green salad' },
    { emoji: '🍝', name: 'spaghetti' },
    { emoji: '🍜', name: 'steaming bowl' },
    { emoji: '🍲', name: 'pot of food' },
    { emoji: '🍛', name: 'curry rice' },
    { emoji: '🍣', name: 'sushi' },
    { emoji: '🍱', name: 'bento box' },
    { emoji: '🥟', name: 'dumpling' },
    { emoji: '🍤', name: 'fried shrimp' },
    { emoji: '🍙', name: 'rice ball' },
    { emoji: '🍚', name: 'cooked rice' },
    { emoji: '🍘', name: 'rice cracker' },
    { emoji: '🍥', name: 'fish cake with swirl' },
    { emoji: '🥠', name: 'fortune cookie' },
    { emoji: '🍿', name: 'popcorn' },
    { emoji: '🧂', name: 'salt' },
    { emoji: '🍦', name: 'soft ice cream' },
    { emoji: '🍧', name: 'shaved ice' },
    { emoji: '🍨', name: 'ice cream' },
    { emoji: '🍩', name: 'doughnut' },
    { emoji: '🍪', name: 'cookie' },
    { emoji: '🎂', name: 'birthday cake' },
    { emoji: '🍰', name: 'shortcake' },
    { emoji: '🧁', name: 'cupcake' },
    { emoji: '🥧', name: 'pie' },
    { emoji: '🍫', name: 'chocolate bar' },
    { emoji: '🍬', name: 'candy' },
    { emoji: '🍭', name: 'lollipop' },
    { emoji: '🍮', name: 'custard' },
    { emoji: '🍯', name: 'honey pot' },
    { emoji: '🍼', name: 'baby bottle' },
    { emoji: '🥛', name: 'glass of milk' },
    { emoji: '☕', name: 'hot beverage' },
    { emoji: '🫖', name: 'teapot' },
    { emoji: '🍵', name: 'teacup without handle' },
    { emoji: '🍶', name: 'sake' },
    { emoji: '🍾', name: 'bottle with popping cork' },
    { emoji: '🍷', name: 'wine glass' },
    { emoji: '🍸', name: 'cocktail glass' },
    { emoji: '🍹', name: 'tropical drink' },
    { emoji: '🍺', name: 'beer mug' },
    { emoji: '🍻', name: 'clinking beer mugs' },
    { emoji: '🥂', name: 'clinking glasses' },
    { emoji: '🥃', name: 'tumbler glass' },
    { emoji: '🥤', name: 'cup with straw' },
    { emoji: '🧋', name: 'bubble tea' },
    { emoji: '🧃', name: 'beverage box' },
    { emoji: '🧉', name: 'mate' },
    { emoji: '🧊', name: 'ice' }
  ],
  activities: [
    { emoji: '⚽', name: 'soccer ball' },
    { emoji: '🏀', name: 'basketball' },
    { emoji: '🏈', name: 'american football' },
    { emoji: '⚾', name: 'baseball' },
    { emoji: '🥎', name: 'softball' },
    { emoji: '🎾', name: 'tennis' },
    { emoji: '🏐', name: 'volleyball' },
    { emoji: '🏉', name: 'rugby football' },
    { emoji: '🥏', name: 'flying disc' },
    { emoji: '🎱', name: 'pool 8 ball' },
    { emoji: '🪀', name: 'yo-yo' },
    { emoji: '🏓', name: 'ping pong' },
    { emoji: '🏸', name: 'badminton' },
    { emoji: '🏒', name: 'ice hockey' },
    { emoji: '🏑', name: 'field hockey' },
    { emoji: '🥍', name: 'lacrosse' },
    { emoji: '🏏', name: 'cricket game' },
    { emoji: '🪃', name: 'boomerang' },
    { emoji: '🥅', name: 'goal net' },
    { emoji: '⛳', name: 'flag in hole' },
    { emoji: '🪁', name: 'kite' },
    { emoji: '🏹', name: 'bow and arrow' },
    { emoji: '🎣', name: 'fishing pole' },
    { emoji: '🤿', name: 'diving mask' },
    { emoji: '🥊', name: 'boxing glove' },
    { emoji: '🥋', name: 'martial arts uniform' },
    { emoji: '🎽', name: 'running shirt' },
    { emoji: '🛹', name: 'skateboard' },
    { emoji: '🛼', name: 'roller skate' },
    { emoji: '🛷', name: 'sled' },
    { emoji: '⛸️', name: 'ice skate' },
    { emoji: '🥌', name: 'curling stone' },
    { emoji: '🎿', name: 'skis' },
    { emoji: '⛷️', name: 'skier' },
    { emoji: '🏂', name: 'snowboarder' },
    { emoji: '🎮', name: 'video game' },
    { emoji: '🕹️', name: 'joystick' },
    { emoji: '🎲', name: 'game die' },
    { emoji: '🧩', name: 'puzzle piece' },
    { emoji: '♟️', name: 'chess pawn' },
    { emoji: '🎭', name: 'performing arts' },
    { emoji: '🎨', name: 'artist palette' },
    { emoji: '🎬', name: 'clapper board' },
    { emoji: '🎤', name: 'microphone' },
    { emoji: '🎧', name: 'headphone' },
    { emoji: '🎼', name: 'musical score' },
    { emoji: '🎹', name: 'musical keyboard' },
    { emoji: '🥁', name: 'drum' },
    { emoji: '🪘', name: 'long drum' },
    { emoji: '🎷', name: 'saxophone' },
    { emoji: '🎺', name: 'trumpet' },
    { emoji: '🎸', name: 'guitar' },
    { emoji: '🪕', name: 'banjo' },
    { emoji: '🎻', name: 'violin' },
    { emoji: '🎪', name: 'circus tent' },
    { emoji: '🎫', name: 'ticket' },
    { emoji: '🎗️', name: 'reminder ribbon' },
    { emoji: '🏆', name: 'trophy' },
    { emoji: '🏅', name: 'sports medal' },
    { emoji: '🥇', name: '1st place medal' },
    { emoji: '🥈', name: '2nd place medal' },
    { emoji: '🥉', name: '3rd place medal' }
  ],
  objects: [
    { emoji: '⌚', name: 'watch' },
    { emoji: '📱', name: 'mobile phone' },
    { emoji: '📲', name: 'mobile phone with arrow' },
    { emoji: '💻', name: 'laptop' },
    { emoji: '⌨️', name: 'keyboard' },
    { emoji: '🖥️', name: 'desktop computer' },
    { emoji: '🖨️', name: 'printer' },
    { emoji: '🖱️', name: 'computer mouse' },
    { emoji: '💽', name: 'computer disk' },
    { emoji: '💾', name: 'floppy disk' },
    { emoji: '💿', name: 'optical disk' },
    { emoji: '📀', name: 'dvd' },
    { emoji: '📼', name: 'videocassette' },
    { emoji: '📷', name: 'camera' },
    { emoji: '📸', name: 'camera with flash' },
    { emoji: '📹', name: 'video camera' },
    { emoji: '🎥', name: 'movie camera' },
    { emoji: '📽️', name: 'film projector' },
    { emoji: '🎞️', name: 'film frames' },
    { emoji: '📞', name: 'telephone receiver' },
    { emoji: '☎️', name: 'telephone' },
    { emoji: '📟', name: 'pager' },
    { emoji: '📠', name: 'fax machine' },
    { emoji: '📺', name: 'television' },
    { emoji: '📻', name: 'radio' },
    { emoji: '🎙️', name: 'studio microphone' },
    { emoji: '🎚️', name: 'level slider' },
    { emoji: '🎛️', name: 'control knobs' },
    { emoji: '🧭', name: 'compass' },
    { emoji: '⏱️', name: 'stopwatch' },
    { emoji: '⏲️', name: 'timer clock' },
    { emoji: '⏰', name: 'alarm clock' },
    { emoji: '🕰️', name: 'mantelpiece clock' },
    { emoji: '⌛', name: 'hourglass done' },
    { emoji: '⏳', name: 'hourglass not done' },
    { emoji: '📡', name: 'satellite antenna' },
    { emoji: '🔋', name: 'battery' },
    { emoji: '🔌', name: 'electric plug' },
    { emoji: '💡', name: 'light bulb' },
    { emoji: '🔦', name: 'flashlight' },
    { emoji: '🕯️', name: 'candle' },
    { emoji: '🧯', name: 'fire extinguisher' },
    { emoji: '💰', name: 'money bag' },
    { emoji: '💵', name: 'dollar banknote' },
    { emoji: '💴', name: 'yen banknote' },
    { emoji: '💶', name: 'euro banknote' },
    { emoji: '💷', name: 'pound banknote' },
    { emoji: '💸', name: 'money with wings' },
    { emoji: '💳', name: 'credit card' }
  ],
  symbols: [
    { emoji: '❤️', name: 'red heart' },
    { emoji: '💔', name: 'broken heart' },
    { emoji: '✨', name: 'sparkles' },
    { emoji: '⭐', name: 'star' },
    { emoji: '🌟', name: 'glowing star' },
    { emoji: '💫', name: 'dizzy' },
    { emoji: '⚡', name: 'high voltage' },
    { emoji: '🔥', name: 'fire' },
    { emoji: '💥', name: 'collision' },
    { emoji: '❄️', name: 'snowflake' },
    { emoji: '☀️', name: 'sun' },
    { emoji: '🌙', name: 'crescent moon' },
    { emoji: '🌈', name: 'rainbow' },
    { emoji: '☁️', name: 'cloud' },
    { emoji: '🌊', name: 'water wave' },
    { emoji: '✅', name: 'check mark button' },
    { emoji: '❌', name: 'cross mark' },
    { emoji: '❓', name: 'question mark' },
    { emoji: '❗', name: 'exclamation mark' },
    { emoji: '💤', name: 'zzz' },
    { emoji: '💬', name: 'speech balloon' },
    { emoji: '💭', name: 'thought balloon' },
    { emoji: '🎵', name: 'musical note' },
    { emoji: '🎶', name: 'musical notes' },
    { emoji: '➕', name: 'plus' },
    { emoji: '➖', name: 'minus' },
    { emoji: '➗', name: 'divide' },
    { emoji: '✖️', name: 'multiply' },
    { emoji: '💲', name: 'heavy dollar sign' },
    { emoji: '💱', name: 'currency exchange' },
    { emoji: '©️', name: 'copyright' },
    { emoji: '®️', name: 'registered' },
    { emoji: '™️', name: 'trade mark' },
    { emoji: '🔴', name: 'red circle' },
    { emoji: '🟠', name: 'orange circle' },
    { emoji: '🟡', name: 'yellow circle' },
    { emoji: '🟢', name: 'green circle' },
    { emoji: '🔵', name: 'blue circle' },
    { emoji: '🟣', name: 'purple circle' },
    { emoji: '⚫', name: 'black circle' },
    { emoji: '⚪', name: 'white circle' },
    { emoji: '🟤', name: 'brown circle' }
  ],
  flags: [
    { emoji: '🏳️', name: 'white flag' },
    { emoji: '🏴', name: 'black flag' },
    { emoji: '🏁', name: 'chequered flag' },
    { emoji: '🚩', name: 'triangular flag' },
    { emoji: '🏳️‍🌈', name: 'rainbow flag' },
    { emoji: '🇺🇸', name: 'flag: United States' },
    { emoji: '🇬🇧', name: 'flag: United Kingdom' },
    { emoji: '🇨🇳', name: 'flag: China' },
    { emoji: '🇯🇵', name: 'flag: Japan' },
    { emoji: '🇰🇷', name: 'flag: South Korea' },
    { emoji: '🇩🇪', name: 'flag: Germany' },
    { emoji: '🇫🇷', name: 'flag: France' },
    { emoji: '🇪🇸', name: 'flag: Spain' },
    { emoji: '🇮🇹', name: 'flag: Italy' },
    { emoji: '🇷🇺', name: 'flag: Russia' },
    { emoji: '🇧🇷', name: 'flag: Brazil' },
    { emoji: '🇦🇺', name: 'flag: Australia' },
    { emoji: '🇨🇦', name: 'flag: Canada' },
    { emoji: '🇮🇳', name: 'flag: India' },
    { emoji: '🇲🇽', name: 'flag: Mexico' }
  ]
};

export default {
  name: 'EmojiPicker',
  props: {
    // 位置: 'top' | 'bottom'
    position: {
      type: String,
      default: 'top'
    }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const showPicker = ref(false);
    const searchQuery = ref('');
    const activeCategory = ref('smileys');
    const showSkinTones = ref(false);
    const selectedSkinTone = ref('default');
    const triggerRef = ref(null);
    const pickerRef = ref(null);
    const searchInput = ref(null);
    const contentRef = ref(null);

    // 分类配置
    const categories = [
      { id: 'smileys', name: 'Smileys & Emotion', icon: '😀' },
      { id: 'gestures', name: 'People & Body', icon: '👋' },
      { id: 'hearts', name: 'Hearts & Symbols', icon: '❤️' },
      { id: 'animals', name: 'Animals & Nature', icon: '🐶' },
      { id: 'food', name: 'Food & Drink', icon: '🍔' },
      { id: 'activities', name: 'Activities', icon: '⚽' },
      { id: 'objects', name: 'Objects', icon: '💡' },
      { id: 'symbols', name: 'Symbols', icon: '✨' },
      { id: 'flags', name: 'Flags', icon: '🏳️' }
    ];

    // 肤色选项
    const skinTones = [
      { id: 'default', name: 'Default', color: '#ffcc4d' },
      { id: 'light', name: 'Light', color: '#ffdbac' },
      { id: 'medium-light', name: 'Medium Light', color: '#f7c5a0' },
      { id: 'medium', name: 'Medium', color: '#d5a06d' },
      { id: 'medium-dark', name: 'Medium Dark', color: '#a16a48' },
      { id: 'dark', name: 'Dark', color: '#60463a' }
    ];

    // 最近使用的 emoji
    const recentEmojis = ref([]);

    // 从 localStorage 加载最近使用
    const loadRecentEmojis = () => {
      try {
        const stored = localStorage.getItem('recentEmojis');
        if (stored) {
          recentEmojis.value = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to load recent emojis:', e);
      }
    };

    // 保存最近使用
    const saveRecentEmojis = () => {
      try {
        localStorage.setItem('recentEmojis', JSON.stringify(recentEmojis.value));
      } catch (e) {
        console.error('Failed to save recent emojis:', e);
      }
    };

    // 获取分类下的 emoji
    const getEmojisByCategory = (categoryId) => {
      return emojiData[categoryId] || [];
    };

    // 搜索过滤
    const filteredEmojis = computed(() => {
      if (!searchQuery.value) return [];
      
      const query = searchQuery.value.toLowerCase();
      const results = [];
      
      for (const category of Object.values(emojiData)) {
        for (const emoji of category) {
          if (emoji.name.toLowerCase().includes(query)) {
            results.push(emoji);
          }
        }
      }
      
      return results.slice(0, 50);
    });

    // 切换选择器
    const togglePicker = () => {
      showPicker.value = !showPicker.value;
      
      if (showPicker.value) {
        nextTick(() => {
          if (searchInput.value) {
            searchInput.value.focus();
          }
        });
      }
    };

    // 选择 emoji
    const selectEmoji = (emoji) => {
      emit('select', emoji.emoji);
      
      // 添加到最近使用
      const index = recentEmojis.value.findIndex(e => e.emoji === emoji.emoji);
      if (index !== -1) {
        recentEmojis.value.splice(index, 1);
      }
      recentEmojis.value.unshift(emoji);
      if (recentEmojis.value.length > 24) {
        recentEmojis.value.pop();
      }
      saveRecentEmojis();
      
      // 可选：选择后关闭
      // showPicker.value = false;
    };

    // 滚动到分类
    const scrollToCategory = (categoryId) => {
      activeCategory.value = categoryId;
      
      const element = document.getElementById(`category-${categoryId}`);
      if (element && contentRef.value) {
        contentRef.value.scrollTo({
          top: element.offsetTop - contentRef.value.offsetTop,
          behavior: 'smooth'
        });
      }
    };

    // 处理滚动
    const handleScroll = () => {
      if (!contentRef.value || searchQuery.value) return;
      
      const scrollTop = contentRef.value.scrollTop;
      
      for (const category of categories) {
        const element = document.getElementById(`category-${category.id}`);
        if (element) {
          const top = element.offsetTop - contentRef.value.offsetTop;
          if (scrollTop >= top - 50) {
            activeCategory.value = category.id;
          }
        }
      }
    };

    // 选择肤色
    const selectSkinTone = (toneId) => {
      selectedSkinTone.value = toneId;
      showSkinTones.value = false;
    };

    // 点击外部关闭
    const handleClickOutside = (event) => {
      if (showPicker.value && 
          pickerRef.value && 
          !pickerRef.value.contains(event.target) &&
          !triggerRef.value.contains(event.target)) {
        showPicker.value = false;
      }
    };

    // 监听搜索清空分类高亮
    watch(searchQuery, (val) => {
      if (val) {
        activeCategory.value = '';
      } else {
        activeCategory.value = 'smileys';
      }
    });

    onMounted(() => {
      loadRecentEmojis();
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      showPicker,
      searchQuery,
      activeCategory,
      showSkinTones,
      selectedSkinTone,
      triggerRef,
      pickerRef,
      searchInput,
      contentRef,
      categories,
      skinTones,
      recentEmojis,
      filteredEmojis,
      getEmojisByCategory,
      togglePicker,
      selectEmoji,
      scrollToCategory,
      handleScroll,
      selectSkinTone
    };
  }
};
</script>

<style lang="scss" scoped>
.emoji-picker-container {
  position: relative;
  
  .emoji-trigger {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    color: #54656f;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
  }
  
  .emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 10px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    width: 320px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    
    .picker-search {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #e9edef;
      
      svg {
        color: #8696a0;
        margin-right: 8px;
        flex-shrink: 0;
      }
      
      input {
        flex: 1;
        border: none;
        font-size: 14px;
        outline: none;
        
        &::placeholder {
          color: #8696a0;
        }
      }
    }
    
    .picker-categories {
      display: flex;
      padding: 8px;
      border-bottom: 1px solid #e9edef;
      overflow-x: auto;
      
      &::-webkit-scrollbar {
        display: none;
      }
      
      .category-btn {
        background: none;
        border: none;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
        font-size: 18px;
        opacity: 0.6;
        transition: all 0.2s;
        
        &:hover {
          background: #f0f2f5;
          opacity: 1;
        }
        
        &.active {
          opacity: 1;
          background: #e7f8f5;
        }
      }
    }
    
    .picker-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      
      .search-results {
        .no-results {
          text-align: center;
          padding: 20px;
          color: #8696a0;
          font-size: 14px;
        }
      }
      
      .emoji-category {
        margin-bottom: 12px;
        
        .category-title {
          font-size: 12px;
          color: #8696a0;
          margin: 0 0 8px 4px;
          font-weight: 500;
        }
      }
      
      .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 2px;
        
        .emoji-btn {
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          font-size: 22px;
          border-radius: 6px;
          transition: background-color 0.15s;
          
          &:hover {
            background: #f0f2f5;
          }
        }
      }
    }
    
    .skin-tone-picker {
      display: flex;
      justify-content: center;
      gap: 4px;
      padding: 8px;
      border-top: 1px solid #e9edef;
      
      .skin-tone-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f2f5;
        
        &:hover {
          background: #e0e2e5;
        }
        
        &.active {
          border-color: #00a884;
        }
      }
    }
  }
}

// 动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

// 深色模式
.dark-mode .emoji-picker-container {
  .emoji-trigger {
    color: #aebac1;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
  
  .emoji-picker {
    background: #233138;
    
    .picker-search {
      border-bottom-color: #3b4a54;
      
      input {
        background: transparent;
        color: #e9edef;
      }
    }
    
    .picker-categories {
      border-bottom-color: #3b4a54;
      
      .category-btn {
        &:hover {
          background: #182229;
        }
        
        &.active {
          background: rgba(0, 168, 132, 0.2);
        }
      }
    }
    
    .picker-content {
      .emoji-grid .emoji-btn:hover {
        background: #182229;
      }
    }
    
    .skin-tone-picker {
      border-top-color: #3b4a54;
      
      .skin-tone-btn {
        background: #182229;
        
        &:hover {
          background: #0d1418;
        }
      }
    }
  }
}
</style>
