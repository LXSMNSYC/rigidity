import { RIGIDITY_SEARCH } from '../../constants';

export default async function loadData<T>(
  pathname: string,
  search: string,
): Promise<T> {
  const params = new URLSearchParams(search);
  params.set(RIGIDITY_SEARCH, '');
  const response = await fetch(`${pathname}?${params.toString()}`);
  const result = await response.json();
  return result as T;
}
