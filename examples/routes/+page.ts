import type { PageLoad } from './$types';
import { DB_PASSWORD } from '$env/static/private';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/profile');
  const profile = await res.json();

  return {
    profile,
    dbPassword: DB_PASSWORD
  };
};
