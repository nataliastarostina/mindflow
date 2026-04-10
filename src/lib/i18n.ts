import type { LayoutMode } from './types';

export type Language = 'en' | 'ru';

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'mindflow_language';

export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
};

type Messages = {
  languageSwitcher: {
    label: string;
    english: string;
    russian: string;
  };
  common: {
    loading: string;
    close: string;
    cancel: string;
    save: string;
    copy: string;
    copied: string;
    delete: string;
    duplicate: string;
    update: string;
    untitled: string;
    untitledNode: string;
    untitledDocument: string;
    defaultMapTitle: string;
    defaultCentralTopic: string;
    defaultNewTopic: string;
    defaultFloatingNote: string;
    copySuffix: string;
    textDocumentPrefix: string;
    you: string;
  };
  dashboard: {
    newMap: string;
    noMapsYet: string;
    emptyDescription: string;
    createBlankMap: string;
    tryDemoMap: string;
    recentMaps: string;
  };
  editor: {
    loadingMap: string;
    loadingYourMap: string;
    autoSaved: string;
    backToDashboard: string;
    search: string;
    searchPlaceholder: string;
    export: string;
    share: string;
    undo: string;
    redo: string;
    zoomOut: string;
    zoomIn: string;
    fitToScreen: string;
    centerMap: string;
    layoutMode: string;
    layoutModes: Record<'radial' | 'right-tree' | 'top-down', string>;
    contextualToolbar: {
      style: string;
      text: string;
      link: string;
      comment: string;
      richText: string;
      connector: string;
      addChild: string;
      more: string;
    };
    edgeToolbar: {
      title: string;
      color: string;
      thickness: string;
      style: string;
      line: string;
      arrows: string;
      start: string;
      end: string;
      noArrow: string;
      open: string;
      arrow: string;
      solid: string;
      dashed: string;
      dotted: string;
      deleteLine: string;
    };
  };
  stylePopover: {
    title: string;
    tabs: {
      shape: string;
      border: string;
      line: string;
    };
    shape: string;
    fillColor: string;
    borderWidth: string;
    borderStyle: string;
    borderColor: string;
    branchColor: string;
    thickness: string;
    lineStyle: string;
    borderWidths: {
      none: string;
      thin: string;
      medium: string;
    };
    lineStyles: {
      solid: string;
      dashed: string;
    };
    shapeOptions: Record<'rounded-rectangle' | 'pill' | 'soft-rectangle' | 'plain-text' | 'underline', string>;
  };
  textStylePopover: {
    title: string;
    presets: string;
    format: string;
    textColor: string;
    presetNames: Record<'Title' | 'Section' | 'Standard' | 'Muted' | 'Emphasis', string>;
  };
  linkPopover: {
    title: string;
    invalidUrl: string;
    addLink: string;
  };
  commentPopover: {
    title: string;
    noCommentsYet: string;
    firstComment: string;
    closeComments: string;
    editComment: string;
    deleteComment: string;
    newComment: string;
    placeholder: string;
    postHint: string;
    postComment: string;
    edited: string;
  };
  notePopover: {
    title: string;
    blockStyles: Record<'body' | 'title' | 'heading' | 'subheading' | 'quote' | 'monospaced', string>;
    bold: string;
    italic: string;
    underline: string;
    bulletedList: string;
    orderedList: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    textColor: string;
    highlight: string;
    heading: string;
    subheading: string;
    quote: string;
    monospaced: string;
    sidebarTitle: string;
    sidebarDescription: string;
    newDocument: string;
    documentTitle: string;
    saveAndClose: string;
    footer: string;
    openTextDocuments: string;
  };
  moreActions: {
    addChild: string;
    addSibling: string;
    duplicate: string;
    delete: string;
  };
  shareModal: {
    title: string;
    description: string;
  };
  exportModal: {
    title: string;
    scope: string;
    mapOnly: string;
    fullPage: string;
    format: string;
    pngTitle: string;
    pngDescription: string;
    pdfTitle: string;
    pdfDescription: string;
    markdownTitle: string;
    markdownDescription: string;
    googleDocsTitle: string;
    googleDocsDescription: string;
    googleTabsTitle: string;
    googleTabsDescription: string;
    selectAllTabs: string;
    clearTabs: string;
    structureOnlyHint: string;
    googleClientMissing: string;
    googleExportFailed: string;
    openGoogleDocument: string;
    googleStructureTab: string;
    googleHierarchy: string;
    googleDocuments: string;
    googleComments: string;
    exporting: string;
    exportFailed: string;
    markdownFallbackTitle: string;
    markdownComment: string;
    markdownLink: string;
  };
  node: {
    link: string;
    openLink: string;
    textDocuments: string;
    openComments: string;
  };
  demo: {
    mapTitle: string;
    centralTopic: string;
    primaryTopics: string[];
    subtopics: string[][];
  };
};

export const messages: Record<Language, Messages> = {
  en: {
    languageSwitcher: {
      label: 'Language',
      english: 'English',
      russian: 'Russian',
    },
    common: {
      loading: 'Loading...',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      copy: 'Copy',
      copied: 'Copied!',
      delete: 'Delete',
      duplicate: 'Duplicate',
      update: 'Update',
      untitled: 'Untitled',
      untitledNode: 'Untitled node',
      untitledDocument: 'Untitled document',
      defaultMapTitle: 'Untitled Map',
      defaultCentralTopic: 'Central Topic',
      defaultNewTopic: 'New topic',
      defaultFloatingNote: 'New note',
      copySuffix: 'Copy',
      textDocumentPrefix: 'Text',
      you: 'You',
    },
    dashboard: {
      newMap: 'New Map',
      noMapsYet: 'No mind maps yet',
      emptyDescription: 'Create your first mind map to start organizing your thoughts visually.',
      createBlankMap: 'Create Blank Map',
      tryDemoMap: 'Try Demo Map',
      recentMaps: 'Recent Maps',
    },
    editor: {
      loadingMap: 'Loading map...',
      loadingYourMap: 'Loading your mind map...',
      autoSaved: 'Auto-saved',
      backToDashboard: 'Back to Dashboard',
      search: 'Search',
      searchPlaceholder: 'Search topics...',
      export: 'Export',
      share: 'Share',
      undo: 'Undo',
      redo: 'Redo',
      zoomOut: 'Zoom Out',
      zoomIn: 'Zoom In',
      fitToScreen: 'Fit to Screen',
      centerMap: 'Center Map',
      layoutMode: 'Layout Mode',
      layoutModes: {
        radial: 'Horizontal ↔',
        'right-tree': 'Right →',
        'top-down': 'Vertical ↓',
      },
      contextualToolbar: {
        style: 'Style',
        text: 'Text',
        link: 'Link',
        comment: 'Comment',
        richText: 'Rich Text',
        connector: 'Connector',
        addChild: 'Add Child',
        more: 'More',
      },
      edgeToolbar: {
        title: 'Line / Arrow',
        color: 'Color',
        thickness: 'Thickness',
        style: 'Style',
        line: 'Line',
        arrows: 'Arrows',
        start: 'Start',
        end: 'End',
        noArrow: 'No arrow',
        open: 'Open',
        arrow: 'Arrow',
        solid: 'Solid',
        dashed: 'Dashed',
        dotted: 'Dotted',
        deleteLine: 'Delete line',
      },
    },
    stylePopover: {
      title: 'Topic Style',
      tabs: {
        shape: 'Shape',
        border: 'Border',
        line: 'Line',
      },
      shape: 'Shape',
      fillColor: 'Fill Color',
      borderWidth: 'Border Width',
      borderStyle: 'Style',
      borderColor: 'Border Color',
      branchColor: 'Branch Color',
      thickness: 'Thickness',
      lineStyle: 'Style',
      borderWidths: {
        none: 'None',
        thin: 'Thin',
        medium: 'Medium',
      },
      lineStyles: {
        solid: 'Solid',
        dashed: 'Dashed',
      },
      shapeOptions: {
        'rounded-rectangle': 'Rounded Rectangle',
        pill: 'Pill',
        'soft-rectangle': 'Soft Rectangle',
        'plain-text': 'Plain Text',
        underline: 'Underline',
      },
    },
    textStylePopover: {
      title: 'Text Style',
      presets: 'Presets',
      format: 'Format',
      textColor: 'Text Color',
      presetNames: {
        Title: 'Title',
        Section: 'Section',
        Standard: 'Standard',
        Muted: 'Muted',
        Emphasis: 'Emphasis',
      },
    },
    linkPopover: {
      title: 'Link',
      invalidUrl: 'Please enter a valid URL (http/https)',
      addLink: 'Add Link',
    },
    commentPopover: {
      title: 'Comments',
      noCommentsYet: 'No comments yet',
      firstComment: 'Add the first comment for this node. It will stay editable after publishing.',
      closeComments: 'Close comments',
      editComment: 'Edit comment',
      deleteComment: 'Delete comment',
      newComment: 'New comment',
      placeholder: 'Write a comment...',
      postHint: 'Press Ctrl+Enter or Cmd+Enter to post',
      postComment: 'Post comment',
      edited: 'edited',
    },
    notePopover: {
      title: 'Documents',
      blockStyles: {
        body: 'Body',
        title: 'Title',
        heading: 'Heading',
        subheading: 'Subheading',
        quote: 'Quote',
        monospaced: 'Monospaced',
      },
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      bulletedList: 'Bulleted list',
      orderedList: 'Ordered list',
      alignLeft: 'Align left',
      alignCenter: 'Align center',
      alignRight: 'Align right',
      textColor: 'Text color',
      highlight: 'Highlight',
      heading: 'Heading',
      subheading: 'Subheading',
      quote: 'Quote',
      monospaced: 'Monospaced',
      sidebarTitle: 'Documents',
      sidebarDescription: 'Each node can hold as many text documents as you need.',
      newDocument: 'New document',
      documentTitle: 'Document title',
      saveAndClose: 'Save and Close',
      footer: 'Notes-like formatting: title, heading, subheading, lists, quote, monospaced text and inline styles.',
      openTextDocuments: 'Open text documents',
    },
    moreActions: {
      addChild: 'Add Child Topic',
      addSibling: 'Add Sibling Topic',
      duplicate: 'Duplicate',
      delete: 'Delete',
    },
    shareModal: {
      title: 'Share Map',
      description: "Anyone with this link can view the map. In the full version, you'll be able to set viewer/editor permissions and invite team members.",
    },
    exportModal: {
      title: 'Export Map',
      scope: 'Export Scope',
      mapOnly: 'Map only (tight crop)',
      fullPage: 'Whole page',
      format: 'Format',
      pngTitle: 'PNG (Image)',
      pngDescription: 'High-quality graphics',
      pdfTitle: 'PDF (Print-ready)',
      pdfDescription: 'Document-friendly export',
      markdownTitle: 'Text & Content (Markdown)',
      markdownDescription: 'Preserves comments, links, and structure',
      googleDocsTitle: 'Google Docs with tabs',
      googleDocsDescription: 'Creates a Google document with one tab per selected node',
      googleTabsTitle: 'Google Docs tabs',
      googleTabsDescription: 'Selected nodes become separate Google Docs tabs. Unselected children stay inside the closest selected parent tab.',
      selectAllTabs: 'Select all',
      clearTabs: 'Clear',
      structureOnlyHint: 'No nodes selected: the Google document will contain only the structure tab.',
      googleClientMissing: 'Google export is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and try again.',
      googleExportFailed: 'Google Docs export failed. Please check Google access and try again.',
      openGoogleDocument: 'Open Google document',
      googleStructureTab: 'Structure',
      googleHierarchy: 'Hierarchy',
      googleDocuments: 'Documents',
      googleComments: 'Comments',
      exporting: 'Exporting...',
      exportFailed: 'Export failed. Please try again.',
      markdownFallbackTitle: 'Mind Map',
      markdownComment: 'Comment',
      markdownLink: 'Link',
    },
    node: {
      link: 'Link',
      openLink: 'Open Link',
      textDocuments: 'Text documents',
      openComments: 'Open comments',
    },
    demo: {
      mapTitle: 'Demo Mind Map',
      centralTopic: 'My Mind Map',
      primaryTopics: ['Ideas', 'Research', 'Planning', 'Design'],
      subtopics: [
        ['Brainstorm', 'Notes'],
        ['Articles', 'Books'],
        ['Timeline', 'Resources'],
        ['UI/UX', 'Branding'],
      ],
    },
  },
  ru: {
    languageSwitcher: {
      label: 'Язык',
      english: 'Английский',
      russian: 'Русский',
    },
    common: {
      loading: 'Загрузка...',
      close: 'Закрыть',
      cancel: 'Отмена',
      save: 'Сохранить',
      copy: 'Копировать',
      copied: 'Скопировано!',
      delete: 'Удалить',
      duplicate: 'Дублировать',
      update: 'Обновить',
      untitled: 'Без названия',
      untitledNode: 'Тема без названия',
      untitledDocument: 'Документ без названия',
      defaultMapTitle: 'Карта без названия',
      defaultCentralTopic: 'Центральная тема',
      defaultNewTopic: 'Новая тема',
      defaultFloatingNote: 'Новая заметка',
      copySuffix: 'Копия',
      textDocumentPrefix: 'Текст',
      you: 'Вы',
    },
    dashboard: {
      newMap: 'Новая карта',
      noMapsYet: 'Пока нет карт',
      emptyDescription: 'Создайте первую ментальную карту, чтобы визуально организовать свои мысли.',
      createBlankMap: 'Создать пустую карту',
      tryDemoMap: 'Открыть демо-карту',
      recentMaps: 'Недавние карты',
    },
    editor: {
      loadingMap: 'Загрузка карты...',
      loadingYourMap: 'Загружаем вашу карту...',
      autoSaved: 'Автосохранение выполнено',
      backToDashboard: 'Назад к списку карт',
      search: 'Поиск',
      searchPlaceholder: 'Искать темы...',
      export: 'Экспорт',
      share: 'Поделиться',
      undo: 'Отменить',
      redo: 'Повторить',
      zoomOut: 'Отдалить',
      zoomIn: 'Приблизить',
      fitToScreen: 'Уместить на экране',
      centerMap: 'Центрировать карту',
      layoutMode: 'Режим раскладки',
      layoutModes: {
        radial: 'Горизонтально ↔',
        'right-tree': 'Вправо →',
        'top-down': 'Вертикально ↓',
      },
      contextualToolbar: {
        style: 'Стиль',
        text: 'Текст',
        link: 'Ссылка',
        comment: 'Комментарий',
        richText: 'Документы',
        connector: 'Связь',
        addChild: 'Добавить дочернюю',
        more: 'Ещё',
      },
      edgeToolbar: {
        title: 'Линия / Стрелка',
        color: 'Цвет',
        thickness: 'Толщина',
        style: 'Стиль',
        line: 'Линия',
        arrows: 'Стрелки',
        start: 'Начало',
        end: 'Конец',
        noArrow: 'Без стрелки',
        open: 'Открытая',
        arrow: 'Стрелка',
        solid: 'Сплошная',
        dashed: 'Пунктирная',
        dotted: 'Точечная',
        deleteLine: 'Удалить линию',
      },
    },
    stylePopover: {
      title: 'Стиль темы',
      tabs: {
        shape: 'Форма',
        border: 'Обводка',
        line: 'Линия',
      },
      shape: 'Форма',
      fillColor: 'Цвет заливки',
      borderWidth: 'Толщина обводки',
      borderStyle: 'Стиль',
      borderColor: 'Цвет обводки',
      branchColor: 'Цвет ветки',
      thickness: 'Толщина',
      lineStyle: 'Стиль',
      borderWidths: {
        none: 'Нет',
        thin: 'Тонкая',
        medium: 'Средняя',
      },
      lineStyles: {
        solid: 'Сплошная',
        dashed: 'Пунктирная',
      },
      shapeOptions: {
        'rounded-rectangle': 'Скруглённый прямоугольник',
        pill: 'Капсула',
        'soft-rectangle': 'Мягкий прямоугольник',
        'plain-text': 'Обычный текст',
        underline: 'Подчёркнутый',
      },
    },
    textStylePopover: {
      title: 'Стиль текста',
      presets: 'Пресеты',
      format: 'Формат',
      textColor: 'Цвет текста',
      presetNames: {
        Title: 'Заголовок',
        Section: 'Раздел',
        Standard: 'Стандарт',
        Muted: 'Спокойный',
        Emphasis: 'Акцент',
      },
    },
    linkPopover: {
      title: 'Ссылка',
      invalidUrl: 'Введите корректный URL (http/https)',
      addLink: 'Добавить ссылку',
    },
    commentPopover: {
      title: 'Комментарии',
      noCommentsYet: 'Комментариев пока нет',
      firstComment: 'Добавьте первый комментарий к этой теме. Его можно будет редактировать и позже.',
      closeComments: 'Закрыть комментарии',
      editComment: 'Редактировать комментарий',
      deleteComment: 'Удалить комментарий',
      newComment: 'Новый комментарий',
      placeholder: 'Напишите комментарий...',
      postHint: 'Нажмите Ctrl+Enter или Cmd+Enter, чтобы отправить',
      postComment: 'Отправить комментарий',
      edited: 'изменено',
    },
    notePopover: {
      title: 'Документы',
      blockStyles: {
        body: 'Основной текст',
        title: 'Заголовок',
        heading: 'Подзаголовок',
        subheading: 'Малый заголовок',
        quote: 'Цитата',
        monospaced: 'Моноширинный',
      },
      bold: 'Жирный',
      italic: 'Курсив',
      underline: 'Подчеркнуть',
      bulletedList: 'Маркированный список',
      orderedList: 'Нумерованный список',
      alignLeft: 'По левому краю',
      alignCenter: 'По центру',
      alignRight: 'По правому краю',
      textColor: 'Цвет текста',
      highlight: 'Подсветка',
      heading: 'Подзаголовок',
      subheading: 'Малый заголовок',
      quote: 'Цитата',
      monospaced: 'Моноширинный',
      sidebarTitle: 'Документы',
      sidebarDescription: 'У каждой темы может быть столько текстовых документов, сколько вам нужно.',
      newDocument: 'Новый документ',
      documentTitle: 'Название документа',
      saveAndClose: 'Сохранить и закрыть',
      footer: 'Форматирование в духе Notes: заголовки, списки, цитаты, моноширинный текст и встроенные стили.',
      openTextDocuments: 'Открыть документы',
    },
    moreActions: {
      addChild: 'Добавить дочернюю тему',
      addSibling: 'Добавить соседнюю тему',
      duplicate: 'Дублировать',
      delete: 'Удалить',
    },
    shareModal: {
      title: 'Поделиться картой',
      description: 'Любой, у кого есть эта ссылка, сможет просматривать карту. В полной версии можно будет настраивать права доступа и приглашать участников.',
    },
    exportModal: {
      title: 'Экспорт карты',
      scope: 'Область экспорта',
      mapOnly: 'Только карта (плотная обрезка)',
      fullPage: 'Вся страница',
      format: 'Формат',
      pngTitle: 'PNG (Изображение)',
      pngDescription: 'Высокое качество графики',
      pdfTitle: 'PDF (Для печати)',
      pdfDescription: 'Удобно для документов и печати',
      markdownTitle: 'Текст и контент (Markdown)',
      markdownDescription: 'Сохраняет комментарии, ссылки и структуру',
      googleDocsTitle: 'Google Docs с вкладками',
      googleDocsDescription: 'Создает Google-документ с отдельной вкладкой для каждой выбранной ячейки',
      googleTabsTitle: 'Вкладки Google Docs',
      googleTabsDescription: 'Выбранные ячейки станут отдельными вкладками. Невыбранные дочерние ячейки останутся внутри ближайшей выбранной родительской вкладки.',
      selectAllTabs: 'Выбрать все',
      clearTabs: 'Снять все',
      structureOnlyHint: 'Ячейки не выбраны: в Google-документе будет только вкладка со структурой.',
      googleClientMissing: 'Экспорт в Google не настроен. Добавьте NEXT_PUBLIC_GOOGLE_CLIENT_ID и попробуйте снова.',
      googleExportFailed: 'Экспорт в Google Docs не удался. Проверьте доступ Google и попробуйте снова.',
      openGoogleDocument: 'Открыть Google-документ',
      googleStructureTab: 'Структура',
      googleHierarchy: 'Иерархия',
      googleDocuments: 'Документы',
      googleComments: 'Комментарии',
      exporting: 'Экспортируем...',
      exportFailed: 'Экспорт не удался. Пожалуйста, попробуйте еще раз.',
      markdownFallbackTitle: 'Ментальная карта',
      markdownComment: 'Комментарий',
      markdownLink: 'Ссылка',
    },
    node: {
      link: 'Ссылка',
      openLink: 'Открыть ссылку',
      textDocuments: 'Документы',
      openComments: 'Открыть комментарии',
    },
    demo: {
      mapTitle: 'Демо-карта',
      centralTopic: 'Моя карта',
      primaryTopics: ['Идеи', 'Исследование', 'Планирование', 'Дизайн'],
      subtopics: [
        ['Мозговой штурм', 'Заметки'],
        ['Статьи', 'Книги'],
        ['Таймлайн', 'Ресурсы'],
        ['UI/UX', 'Брендинг'],
      ],
    },
  },
};

export function getLocale(language: Language): string {
  return LANGUAGE_LOCALES[language];
}

export function detectPreferredLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'ru') {
    return stored;
  }

  return window.navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function getLayoutModeLabel(mode: LayoutMode | undefined, language: Language): string {
  if (!mode) return messages[language].editor.layoutModes.radial;
  return messages[language].editor.layoutModes[mode];
}

export function getShapeLabel(shapeId: keyof Messages['stylePopover']['shapeOptions'], language: Language): string {
  return messages[language].stylePopover.shapeOptions[shapeId];
}

export function getFontPresetLabel(
  presetName: keyof Messages['textStylePopover']['presetNames'],
  language: Language
): string {
  return messages[language].textStylePopover.presetNames[presetName];
}

export function getDocumentDefaultTitle(index: number, language: Language): string {
  return `${messages[language].common.textDocumentPrefix} ${index}`;
}

export function getCopyTitle(title: string, language: Language): string {
  return `${title} (${messages[language].common.copySuffix})`;
}

export function formatTopicsCount(count: number, language: Language): string {
  if (language === 'ru') {
    return `${count} ${pluralizeRu(count, ['тема', 'темы', 'тем'])}`;
  }
  return `${count} topic${count === 1 ? '' : 's'}`;
}

export function formatCommentsCount(count: number, language: Language): string {
  if (language === 'ru') {
    return `${count} ${pluralizeRu(count, ['комментарий', 'комментария', 'комментариев'])}`;
  }
  return `${count} comment${count === 1 ? '' : 's'}`;
}

export function formatDocumentLabel(index: number, language: Language): string {
  return language === 'ru' ? `Документ ${index}` : `Document ${index}`;
}

export function formatCommentTimestamp(createdAt: string, updatedAt: string, language: Language): string {
  const locale = getLocale(language);
  const createdLabel = new Date(createdAt).toLocaleString(locale);

  if (createdAt === updatedAt) {
    return createdLabel;
  }

  const updatedLabel = new Date(updatedAt).toLocaleString(locale);
  return `${createdLabel} · ${messages[language].commentPopover.edited} ${updatedLabel}`;
}

function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
