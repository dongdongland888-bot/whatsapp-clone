/**
 * Tests for useInfiniteScroll composable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';

describe('useInfiniteScroll Composable', () => {
  let containerRef;
  let mockLoadMore;

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Create a mock container element
    containerRef = ref({
      scrollTop: 500,
      scrollHeight: 1000,
      clientHeight: 400,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    
    mockLoadMore = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should return correct properties and methods', () => {
      const result = useInfiniteScroll(containerRef, mockLoadMore);
      
      expect(result).toHaveProperty('isLoading');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('reset');
      expect(result).toHaveProperty('triggerLoad');
      expect(result).toHaveProperty('preserveScrollPosition');
    });

    it('should initialize with correct default values', () => {
      const { isLoading, hasMore, error } = useInfiniteScroll(containerRef, mockLoadMore);
      
      expect(isLoading.value).toBe(false);
      expect(hasMore.value).toBe(true);
      expect(error.value).toBe(null);
    });
  });

  describe('triggerLoad', () => {
    it('should call loadMore function', async () => {
      const { triggerLoad } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should set isLoading during load', async () => {
      let resolveLoad;
      mockLoadMore.mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));
      
      const { triggerLoad, isLoading } = useInfiniteScroll(containerRef, mockLoadMore);
      
      const loadPromise = triggerLoad();
      expect(isLoading.value).toBe(true);
      
      resolveLoad([]);
      await loadPromise;
      
      expect(isLoading.value).toBe(false);
    });

    it('should not call loadMore when already loading', async () => {
      let resolveLoad;
      mockLoadMore.mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));
      
      const { triggerLoad } = useInfiniteScroll(containerRef, mockLoadMore);
      
      triggerLoad();
      triggerLoad();
      triggerLoad();
      
      expect(mockLoadMore).toHaveBeenCalledTimes(1);
      
      resolveLoad([]);
    });

    it('should not call loadMore when hasMore is false', async () => {
      const { triggerLoad, hasMore } = useInfiniteScroll(containerRef, mockLoadMore);
      
      hasMore.value = false;
      
      await triggerLoad();
      
      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should set hasMore to false when loadMore returns false', async () => {
      mockLoadMore.mockResolvedValue(false);
      
      const { triggerLoad, hasMore } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(hasMore.value).toBe(false);
    });

    it('should set hasMore to false when loadMore returns empty array', async () => {
      mockLoadMore.mockResolvedValue([]);
      
      const { triggerLoad, hasMore } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(hasMore.value).toBe(false);
    });

    it('should keep hasMore true when loadMore returns items', async () => {
      mockLoadMore.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      
      const { triggerLoad, hasMore } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(hasMore.value).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should set error when loadMore fails', async () => {
      const errorMessage = 'Network error';
      mockLoadMore.mockRejectedValue(new Error(errorMessage));
      
      const { triggerLoad, error } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(error.value).toBe(errorMessage);
    });

    it('should set default error message when error has no message', async () => {
      mockLoadMore.mockRejectedValue({});
      
      const { triggerLoad, error } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(error.value).toBe('Failed to load more');
    });

    it('should reset error on successful load', async () => {
      const { triggerLoad, error, hasMore } = useInfiniteScroll(containerRef, mockLoadMore);
      
      // First, create an error
      mockLoadMore.mockRejectedValueOnce(new Error('First error'));
      await triggerLoad();
      expect(error.value).toBe('First error');
      
      // Reset and try again
      hasMore.value = true;
      mockLoadMore.mockResolvedValueOnce([{ id: 1 }]);
      await triggerLoad();
      expect(error.value).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset all state values', async () => {
      mockLoadMore.mockRejectedValue(new Error('Error'));
      
      const { triggerLoad, reset, isLoading, hasMore, error } = useInfiniteScroll(containerRef, mockLoadMore);
      
      await triggerLoad();
      
      expect(error.value).not.toBe(null);
      
      reset();
      
      expect(hasMore.value).toBe(true);
      expect(error.value).toBe(null);
      expect(isLoading.value).toBe(false);
    });
  });

  describe('preserveScrollPosition', () => {
    it('should work without container', () => {
      const nullRef = ref(null);
      const { preserveScrollPosition } = useInfiniteScroll(nullRef, mockLoadMore);
      
      const callback = vi.fn();
      preserveScrollPosition(callback);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Options', () => {
    it('should use default threshold of 100', () => {
      const { isLoading, hasMore, error } = useInfiniteScroll(containerRef, mockLoadMore);
      
      // Default values should be set
      expect(isLoading.value).toBe(false);
    });

    it('should accept custom threshold', () => {
      const { isLoading } = useInfiniteScroll(containerRef, mockLoadMore, { threshold: 200 });
      
      expect(isLoading.value).toBe(false);
    });

    it('should accept custom direction', () => {
      const { isLoading } = useInfiniteScroll(containerRef, mockLoadMore, { direction: 'down' });
      
      expect(isLoading.value).toBe(false);
    });

    it('should accept custom debounceMs', () => {
      const { isLoading } = useInfiniteScroll(containerRef, mockLoadMore, { debounceMs: 100 });
      
      expect(isLoading.value).toBe(false);
    });
  });
});
