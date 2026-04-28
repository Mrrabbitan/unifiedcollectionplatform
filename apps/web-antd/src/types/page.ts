interface PageInfo<T> {
  currentPage: number;
  pageNo: number;
  pageSize: number;
  total: number;
  totalList: T[];
  totalPage: number;
}

export type {PageInfo}
