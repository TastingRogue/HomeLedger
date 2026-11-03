import { afterEach,describe,expect,it,vi } from 'vitest';
import Fastify from 'fastify';
import { importRoutes } from './imports.routes.js';
import { ImportService } from '../../services/import.service.js';
afterEach(()=>vi.restoreAllMocks());
describe('import confirmation HTTP row selection',()=>{
  async function app(){const server=Fastify();server.addHook('onRequest',async request=>{Object.assign(request,{user:{userId:1,role:'user'}});});await server.register(importRoutes,{prefix:'/imports'});return server;}
  it('accepts preview row zero and passes it through to the importer',async()=>{
    const confirm=vi.spyOn(ImportService,'confirm').mockReturnValue({sessionId:7,importedCount:1,duplicateCount:0,skippedCount:0,matchedCount:0,transactions:[{id:1,name:'First row'}]});
    const server=await app();try{const response=await server.inject({method:'POST',url:'/imports/7/confirm',payload:{accountId:2,defaultCategoryId:3,selectedTransactionIds:[0]}});expect(response.statusCode).toBe(200);expect(confirm).toHaveBeenCalledWith(7,1,expect.objectContaining({selectedTransactionIds:[0],accountId:2}));}finally{await server.close();}
  });
  it('rejects negative preview indices before invoking the importer',async()=>{
    const confirm=vi.spyOn(ImportService,'confirm');const server=await app();try{const response=await server.inject({method:'POST',url:'/imports/7/confirm',payload:{accountId:2,selectedTransactionIds:[-1]}});expect(response.statusCode).toBe(422);expect(confirm).not.toHaveBeenCalled();}finally{await server.close();}
  });
});
