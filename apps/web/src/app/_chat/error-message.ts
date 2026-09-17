/** What to tell the reader when a turn fails with the given ChatRequestError code. */
export function errorMessage(code: string, scopedToPage: boolean): string {
    switch (code) {
        case 'no-source':
            return scopedToPage
                ? 'Nothing on this page matched. Try asking about the whole site.'
                : 'Nothing on the site matched that question.';
        case 'too-many-requests':
        case 'rate-limited':
            return 'Too many questions at once. Please wait a minute and try again.';
        case 'quota-exhausted':
            return 'The assistant has used up its daily allowance. Please try again tomorrow.';
        case 'message-too-long':
            return 'That message is too long. Please shorten it.';
        case 'network':
            return 'Could not reach the assistant. Check your connection and try again.';
        case 'interrupted':
            return 'The answer was cut off. Please try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
