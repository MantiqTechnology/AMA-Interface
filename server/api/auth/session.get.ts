import { requireDemoSession } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { toDemoSessionDto } from '../../utils/demo-session';

export default defineApiEventHandler((event) => toDemoSessionDto(requireDemoSession(event)));
