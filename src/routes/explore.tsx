import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import z from 'zod';
import {
  IconSearch,
  IconX,
  IconChevronRight,
  IconCalendar,
  IconSortAscending,
  IconSortDescending,
  IconUsers,
  IconFilter,
  IconClock,
  IconBook,
  IconFlame,
  IconTargetArrow,
  IconStar,
  IconTrendingUp,
  IconHeartHandshake,
  IconBrain,
  IconBolt,
  IconRocket,
  IconArrowLeft,
  IconGift,
} from '@tabler/icons-react';

import { searchQuizzes } from '~/lib/actions/search-quizzes';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Calendar } from '~/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Skeleton } from '~/components/ui/skeleton';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';

const SearchParams = z.object({
  search: z.string().default('').catch(''),
  userIds: z.string().default('').catch(''), // Changed to support multiple
  sortBy: z.enum(['title', 'updated']).default('updated').catch('updated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  dateFrom: z.string().default('').catch(''),
  dateTo: z.string().default('').catch(''),
});

export const Route = createFileRoute('/explore')({
  validateSearch: SearchParams,
  component: RouteComponent,
});

interface QuizResult {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string;
  userImage: string | null;
}

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    search.dateFrom ? new Date(search.dateFrom) : undefined,
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    search.dateTo ? new Date(search.dateTo) : undefined,
  );
  const [searchQuery, setSearchQuery] = useState(search.search || '');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [resultCount, setResultCount] = useState(6);

  const selectedUserIds = useMemo(() => {
    return search.userIds ? search.userIds.split(',').filter(Boolean) : [];
  }, [search.userIds]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // If multiple users are selected, we need to fetch all and combine results
        let allResults: QuizResult[] = [];
        let allUsersData: Array<{ id: string; name: string }> = [];

        if (selectedUserIds.length > 1) {
          // Fetch results for each user and combine
          for (const userId of selectedUserIds) {
            const result = await searchQuizzes({
              data: {
                search: search.search || '',
                userId: userId,
                sortBy: search.sortBy || 'updated',
                sortOrder: search.sortOrder || 'desc',
                dateFrom: search.dateFrom,
                dateTo: search.dateTo,
              },
            });

            if (result.success && result.data) {
              allResults = allResults.concat(
                result.data.quizzes.map((q: any) => ({
                  ...q,
                  createdAt: new Date(q.createdAt),
                  updatedAt: new Date(q.updatedAt),
                })),
              );
              allUsersData = result.data.users;
            }
          }
          // Remove duplicates and apply sorting
          const uniqueResults = Array.from(
            new Map(allResults.map(q => [q.id, q])).values(),
          );
          setResults(uniqueResults);
        } else {
          // Single user or no user filter
          const result = await searchQuizzes({
            data: {
              search: search.search || '',
              userId: selectedUserIds[0] || '',
              sortBy: search.sortBy || 'updated',
              sortOrder: search.sortOrder || 'desc',
              dateFrom: search.dateFrom,
              dateTo: search.dateTo,
            },
          });

          if (result.success && result.data) {
            setResults(
              result.data.quizzes.map((q: any) => ({
                ...q,
                createdAt: new Date(q.createdAt),
                updatedAt: new Date(q.updatedAt),
              })),
            );
            allUsersData = result.data.users;
          }
        }

        setAllUsers(allUsersData);
        setResultCount(results.length);

        // Generate search suggestions from results
        const suggestions = allResults.map((q: any) => q.title).slice(0, 5);
        setSearchSuggestions(suggestions);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedUserIds]);

  const updateSearch = useCallback(
    (params: Partial<z.infer<typeof SearchParams>>) => {
      navigate({
        to: '/explore',
        search: prev => ({
          ...prev,
          ...params,
        }),
      });
    },
    [navigate],
  );

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    updateSearch({ dateFrom: date?.toISOString().split('T')[0] || '' });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    updateSearch({ dateTo: date?.toISOString().split('T')[0] || '' });
  };

  const clearFilters = useCallback(() => {
    navigate({ to: '/explore', search: {} });
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery('');
    setUserSearch('');
  }, [navigate]);

  const handleAddUser = useCallback(
    (userId: string) => {
      const newIds = selectedUserIds.includes(userId)
        ? selectedUserIds.filter(id => id !== userId)
        : [...selectedUserIds, userId];
      updateSearch({ userIds: newIds.join(',') });
    },
    [selectedUserIds, updateSearch],
  );

  const hasActiveFilters = useMemo(
    () =>
      !!search.search ||
      selectedUserIds.length > 0 ||
      !!search.dateFrom ||
      !!search.dateTo ||
      search.sortBy !== 'updated' ||
      search.sortOrder !== 'desc',
    [search, selectedUserIds],
  ) as boolean;

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()),
    );
  }, [allUsers, userSearch]);

  return (
    <div className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-lime-600/5 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      <div className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between gap-4">
              <button
                onClick={() => navigate({ to: '/' })}
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white sm:inline-flex"
                aria-label="Back to home"
              >
                <IconArrowLeft size={18} />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 lg:hidden"
              >
                <IconFilter size={18} className="mr-2" />
                Filters
              </Button>
            </div>
            <div className="max-w-3xl space-y-2 text-center">
              <h1 className="inline-flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
                <IconRocket size={28} className="text-lime-400" />
                Explore Quizzes
              </h1>
              <p className="text-sm text-neutral-400 sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <IconFlame size={16} className="text-orange-400" />
                  Discover and play amazing quizzes created by our community
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Sidebar - Filters */}
          <FilterPanel
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
            hasActiveFilters={hasActiveFilters}
            filteredUsers={filteredUsers}
            userSearch={userSearch}
            selectedUserIds={selectedUserIds}
            allUsers={allUsers}
            updateSearch={updateSearch}
            handleDateFromChange={handleDateFromChange}
            handleDateToChange={handleDateToChange}
            handleAddUser={handleAddUser}
            clearFilters={clearFilters}
            setUserSearch={setUserSearch}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />

          {/* Right Content - Results */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative rounded-lg border border-neutral-700 bg-neutral-900/50 p-2 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-3 py-1">
                  <IconSearch size={20} className="shrink-0 text-lime-400" />
                  <div className="min-w-0 flex-1">
                    <Input
                      placeholder="Search quizzes by title or description..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        updateSearch({ search: e.target.value || '' });
                        setShowSearchPanel(true);
                      }}
                      onFocus={() => setShowSearchPanel(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSearchPanel(false), 200)
                      }
                      className="border-none bg-transparent text-white placeholder-neutral-500 hover:bg-transparent focus:ring-0 focus-visible:ring-0"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        updateSearch({ search: '' });
                      }}
                      className="shrink-0 rounded-lg p-1 transition-colors hover:bg-neutral-800"
                    >
                      <IconX size={18} className="text-neutral-400" />
                    </button>
                  )}
                </div>

                {/* Search Suggestions */}
                {showSearchPanel &&
                  searchSuggestions.length > 0 &&
                  searchQuery && (
                    <div className="absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded border border-neutral-700 bg-neutral-900 shadow-lg">
                      {searchSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            updateSearch({ search: suggestion });
                            setShowSearchPanel(false);
                          }}
                          className="flex w-full items-center gap-2 border-b border-neutral-800 px-4 py-2 text-left text-sm text-neutral-300 transition-colors last:border-b-0 hover:bg-neutral-800"
                        >
                          <IconSearch size={14} className="text-lime-400" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Results Section */}
            <div>
              {loading ? (
                <div className="space-y-4">
                  <SkeletonGridLoader count={resultCount} />
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-lg border border-neutral-800 bg-linear-to-br from-neutral-900 to-neutral-950 px-6 py-16 text-center">
                  <div className="mb-4 flex justify-center gap-2 text-4xl">
                    <IconBrain className="text-lime-400" />
                    <IconGift className="text-purple-400" />
                  </div>
                  <p className="text-lg text-neutral-400">
                    {search.search || hasActiveFilters
                      ? 'No quizzes found. Try adjusting your filters.'
                      : 'No quizzes yet. Be the first to create one!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm text-neutral-400">
                      <IconRocket size={16} className="text-lime-400" />
                      Found{' '}
                      <span className="font-semibold text-lime-400">
                        {results.length}
                      </span>{' '}
                      quiz{results.length !== 1 ? 'zes' : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {results.map(quiz => (
                      <QuizCard key={quiz.id} quiz={quiz} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuizCardProps {
  quiz: QuizResult;
}

function FilterPanel({
  search,
  dateFrom,
  dateTo,
  hasActiveFilters,
  filteredUsers,
  userSearch,
  selectedUserIds,
  allUsers,
  updateSearch,
  handleDateFromChange,
  handleDateToChange,
  handleAddUser,
  clearFilters,
  setUserSearch,
  showFilters,
  setShowFilters,
}: {
  search: z.infer<typeof SearchParams>;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  hasActiveFilters: boolean;
  filteredUsers: Array<{ id: string; name: string }>;
  userSearch: string;
  selectedUserIds: string[];
  allUsers: Array<{ id: string; name: string }>;
  updateSearch: (params: Partial<z.infer<typeof SearchParams>>) => void;
  handleDateFromChange: (date: Date | undefined) => void;
  handleDateToChange: (date: Date | undefined) => void;
  handleAddUser: (userId: string) => void;
  clearFilters: () => void;
  setUserSearch: (search: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}) {
  const filterContent = (
    <div className="space-y-6">
      {/* Sort By with Radio Cards */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <IconTargetArrow size={18} className="text-yellow-400" />
          Sort By
        </h3>
        <RadioGroup
          value={search.sortBy || 'updated'}
          onValueChange={value =>
            updateSearch({ sortBy: value as 'title' | 'updated' })
          }
        >
          <div className="space-y-2">
            <div
              className={`flex min-w-0 cursor-pointer items-center space-x-3 rounded border-2 p-3 transition-all ${
                search.sortBy === 'updated'
                  ? 'border-lime-500 bg-lime-600/10'
                  : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
              }`}
              onClick={() => updateSearch({ sortBy: 'updated' })}
            >
              <RadioGroupItem
                value="updated"
                id="sort-updated"
                className="border-lime-400"
              />
              <label
                htmlFor="sort-updated"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
              >
                <IconClock size={16} className="text-blue-400" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-white">
                    Last Updated
                  </span>
                  <span className="text-xs text-neutral-500">
                    Most recent first
                  </span>
                </div>
              </label>
            </div>
            <div
              className={`flex min-w-0 cursor-pointer items-center space-x-3 rounded border-2 p-3 transition-all ${
                search.sortBy === 'title'
                  ? 'border-lime-500 bg-lime-600/10'
                  : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
              }`}
              onClick={() => updateSearch({ sortBy: 'title' })}
            >
              <RadioGroupItem
                value="title"
                id="sort-title"
                className="border-lime-400"
              />
              <label
                htmlFor="sort-title"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
              >
                <IconBook size={16} className="text-purple-400" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-white">
                    Alphabetical
                  </span>
                  <span className="text-xs text-neutral-500">A to Z order</span>
                </div>
              </label>
            </div>
          </div>
        </RadioGroup>
      </div>

      <Separator orientation="horizontal" className="bg-neutral-800" />

      {/* Sort Order */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <IconTrendingUp size={18} className="text-cyan-400" />
          Order
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSearch({ sortOrder: 'asc' })}
            className={`rounded border-2 p-3 text-left transition-all ${
              search.sortOrder === 'asc'
                ? 'border-lime-500 bg-lime-600/10'
                : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <IconSortAscending size={16} className="text-lime-400" />
              <span className="text-xs font-semibold text-white">
                Ascending
              </span>
            </div>
            <span className="text-xs text-neutral-400">A → Z</span>
          </button>
          <button
            onClick={() => updateSearch({ sortOrder: 'desc' })}
            className={`rounded border-2 p-3 text-left transition-all ${
              search.sortOrder === 'desc'
                ? 'border-lime-500 bg-lime-600/10'
                : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <IconSortDescending size={16} className="text-orange-400" />
              <span className="text-xs font-semibold text-white">
                Descending
              </span>
            </div>
            <span className="text-xs text-neutral-400">Z → A</span>
          </button>
        </div>
      </div>

      <Separator orientation="horizontal" className="bg-neutral-800" />

      {/* Users Filter */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <IconHeartHandshake size={18} className="text-pink-400" />
          Authors
        </h3>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2">
                  <IconUsers size={16} className="text-pink-400" />
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} selected`
                    : 'All Users'}
                </span>
                <IconChevronRight size={16} />
              </Button>
            }
          />
          <PopoverContent className="w-80 rounded-lg border-neutral-700 bg-neutral-900 p-0">
            <div className="space-y-2">
              <div className="border-b border-neutral-800 p-3">
                <Input
                  placeholder="Search authors..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user.id)}
                      className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
                        selectedUserIds.includes(user.id)
                          ? 'bg-lime-600/20 text-lime-300'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border transition-colors ${
                          selectedUserIds.includes(user.id)
                            ? 'border-lime-600 bg-lime-600'
                            : 'border-neutral-600'
                        }`}
                      >
                        {selectedUserIds.includes(user.id) && (
                          <span className="flex items-center justify-center text-xs text-white">
                            ✓
                          </span>
                        )}
                      </div>
                      {user.name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-sm text-neutral-500">
                    No authors found
                  </p>
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <div className="border-t border-neutral-800 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSearch({ userIds: '' })}
                    className="w-full text-xs text-neutral-400 hover:text-neutral-300"
                  >
                    Clear selection
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {selectedUserIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedUserIds.map(userId => {
              const user = allUsers.find(u => u.id === userId);
              return user ? (
                <Badge
                  key={userId}
                  className="border border-lime-600/30 bg-lime-600/20 text-lime-300"
                >
                  {user.name}
                  <button
                    onClick={() => handleAddUser(userId)}
                    className="ml-1 hover:text-lime-200"
                  >
                    ×
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      <Separator orientation="horizontal" className="bg-neutral-800" />

      {/* Date Range */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <IconCalendar size={18} className="text-green-400" />
          Date Range
        </h3>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                {dateFrom && dateTo ? (
                  <span className="text-xs">
                    {format(dateFrom, 'MMM d')} – {format(dateTo, 'MMM d')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <IconCalendar size={14} className="text-green-400" />
                    Select date range
                  </span>
                )}
                <IconChevronRight size={16} />
              </Button>
            }
          />
          <PopoverContent className="w-auto rounded-lg border-neutral-700 bg-neutral-900 p-4">
            <div className="flex gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-400">
                  From
                </p>
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  disabled={date => (dateTo ? date > dateTo : false)}
                  className="rounded-md border border-neutral-800"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-400">To</p>
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  disabled={date => (dateFrom ? date < dateFrom : false)}
                  className="rounded-md border border-neutral-800"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <>
          <Separator orientation="horizontal" className="bg-neutral-800" />
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="w-full text-neutral-400 hover:bg-red-950/30 hover:text-red-300"
          >
            <IconX size={18} className="mr-2" />
            Clear all filters
          </Button>
        </>
      )}
    </div>
  );

  // Mobile sheet
  return (
    <>
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent
          side="left"
          className="w-80 border-neutral-800 bg-neutral-900 sm:w-96"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-white">
              <IconFilter size={20} className="text-lime-400" />
              Filters
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 px-6 pb-6">{filterContent}</div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="sticky top-24 hidden h-fit rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm lg:block">
        {filterContent}
      </div>
    </>
  );
}

function SkeletonGridLoader({ count = 6 }: { count?: number }) {
  const skeletonIcons = [
    IconBrain,
    IconBook,
    IconBolt,
    IconGift,
    IconStar,
    IconRocket,
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[...Array(count)].map((_, i) => {
        const Icon = skeletonIcons[i % skeletonIcons.length];
        return (
          <div
            key={i}
            className="animate-pulse space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            {/* Icon and Title skeleton */}
            <div className="flex items-start gap-2">
              <div className="mt-0.5 p-1.5">
                <Icon size={16} className="text-neutral-700" />
              </div>
              <Skeleton className="h-6 w-5/6 rounded bg-neutral-800" />
            </div>

            {/* Description skeleton - 2 lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded bg-neutral-800" />
              <Skeleton className="h-4 w-4/5 rounded bg-neutral-800" />
            </div>

            {/* Separator */}
            <div className="my-3 h-px bg-neutral-800" />

            {/* User info skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full bg-neutral-800" />
                <Skeleton className="h-4 w-24 rounded bg-neutral-800" />
              </div>
            </div>

            {/* Button skeleton */}
            <Skeleton className="mt-2 h-5 w-20 rounded bg-neutral-800" />
          </div>
        );
      })}
    </div>
  );
}

function QuizCard({ quiz }: QuizCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate({ to: `/play/${quiz.id}` })}
      className="group relative flex cursor-pointer flex-col rounded-lg border border-neutral-700 bg-neutral-900 p-6 text-left transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-900/70"
    >
      <div>
        <h3 className="line-clamp-2 text-lg font-semibold text-white">
          {quiz.title}
        </h3>
      </div>

      <div className="flex-1 py-4">
        {quiz.description ? (
          <p className="line-clamp-3 text-sm text-neutral-400">
            {quiz.description}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">No description available</p>
        )}
      </div>

      {/* Meta Info Row */}
      <div className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-3">
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-neutral-700">
            <AvatarImage src={quiz.userImage || ''} />
            <AvatarFallback className="bg-lime-600/20 text-xs font-semibold text-lime-300">
              {quiz.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-neutral-300">
              {quiz.userName}
            </span>
            <span className="text-xs text-neutral-500">
              Created{' '}
              {formatDistanceToNow(new Date(quiz.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Update Time */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-neutral-500">Updated</span>
          <span className="text-xs font-medium text-neutral-300">
            {formatDistanceToNow(new Date(quiz.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </button>
  );
}
