// frontend/utils/withAuth.tsx

import { GetServerSideProps, GetServerSidePropsContext } from 'next';

export function withAuth(gssp: GetServerSideProps): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const { req } = context;
    const token = req.cookies.access_token;

    if (!token) {
      // Redirect to login page if no token is found
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    return await gssp(context);
  };
}