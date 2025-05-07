#include "llvm/Passes/PassPlugin.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/IR/IRBuilder.h"

using namespace llvm;

struct LLVMPass : public PassInfoMixin<LLVMPass> {
  PreservedAnalyses run(Module &M, ModuleAnalysisManager &MAM);
};

PreservedAnalyses LLVMPass::run(Module &M, ModuleAnalysisManager &MAM) {
  LLVMContext &Ctx = M.getContext();
  IntegerType *Int32Ty = IntegerType::getInt32Ty(Ctx);
  FunctionCallee debug_func = M.getOrInsertFunction("debug", Int32Ty);
  ConstantInt *debug_arg = ConstantInt::get(Int32Ty, 48763);
  PointerType *CharPtrTy = Type::getInt8PtrTy(Ctx);


  Function *MainFunc = M.getFunction("main");
  if (!MainFunc) {
    errs() << "Could not find main function\n";
    return PreservedAnalyses::none();
  }

  BasicBlock &EntryBB = MainFunc->getEntryBlock();
  IRBuilder<> Builder(&*EntryBB.begin());
  

  Builder.CreateCall(debug_func, {debug_arg});
  

  Constant *HayakuStr = ConstantDataArray::getString(Ctx, "hayaku... motohayaku!", true);
  GlobalVariable *HayakuGV = new GlobalVariable(M, HayakuStr->getType(), true, 
                                               GlobalValue::PrivateLinkage, HayakuStr, ".str");
  

  Constant *Zero = ConstantInt::get(Int32Ty, 0);
  std::vector<Constant*> Indices = {Zero, Zero};
  Constant *HayakuPtr = ConstantExpr::getGetElementPtr(HayakuStr->getType(), HayakuGV, Indices);
  

  Value *Argv = &*std::next(MainFunc->arg_begin()); 
  Value *ArgvIdx = Builder.CreateGEP(CharPtrTy, Argv, Builder.getInt32(1));
  Builder.CreateStore(HayakuPtr, ArgvIdx);
  

  AllocaInst *LocalArgc = Builder.CreateAlloca(Int32Ty, nullptr, "local_argc");
  

  Builder.CreateStore(debug_arg, LocalArgc);

  Value *Argc = &*MainFunc->arg_begin(); 
  SmallVector<User*, 8> Users(Argc->user_begin(), Argc->user_end());
  
  for (User *U : Users) {
    if (Instruction *I = dyn_cast<Instruction>(U)) {
      IRBuilder<> UseBuilder(I);
      Value *LoadedArgc = UseBuilder.CreateLoad(Int32Ty, LocalArgc);
      I->replaceUsesOfWith(Argc, LoadedArgc);
    }
  }
  for (auto &F : M) {
    errs() << "func: " << F.getName() << "\n";

  }
  return PreservedAnalyses::none();
}

extern "C" ::llvm::PassPluginLibraryInfo LLVM_ATTRIBUTE_WEAK
llvmGetPassPluginInfo() {
  return {LLVM_PLUGIN_API_VERSION, "LLVMPass", "1.0",
    [](PassBuilder &PB) {
      PB.registerOptimizerLastEPCallback(
        [](ModulePassManager &MPM, OptimizationLevel OL) {
          MPM.addPass(LLVMPass());
        });
    }};
}

