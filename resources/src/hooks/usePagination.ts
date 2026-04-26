import { useState, useMemo, useEffect } from 'react';

export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  // Ensure current page is within bounds when data changes
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // If the safe page is different from current page, update it so state is consistent
  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }, [data, safeCurrentPage, itemsPerPage]);

  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  return {
    currentPage: safeCurrentPage,
    totalPages,
    paginatedData,
    nextPage,
    prevPage,
    goToPage,
  };
}
