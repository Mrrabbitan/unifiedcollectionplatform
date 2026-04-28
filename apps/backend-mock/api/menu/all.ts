import { eventHandler } from 'h3';
import { MOCK_MENUS } from '~/utils/mock-data';
import { useResponseSuccess } from '~/utils/response';

export default eventHandler(async () => {
  // 开发期：不校验 token，固定返回 super 角色（vben）的全部菜单
  const menus =
    MOCK_MENUS.find((item) => item.username === 'vben')?.menus ?? [];
  return useResponseSuccess(menus);
});
