import { apiSlice } from '../../app/api/apiSlice';
import { setUnreadCounts } from './chatSlice';

type UnreadSummaryResponse = Record<string, number>;

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadSummary: builder.query<UnreadSummaryResponse, void>({
      query: () => '/chat/unread-summary',
      transformResponse: (response: { data: UnreadSummaryResponse }) => {
        return response.data || {};
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUnreadCounts(data));
        } catch (error) {
          console.error('Failed to get unread summary:', error);
        }
      },
    }),
  }),
});

export const { useLazyGetUnreadSummaryQuery } = chatApi;
