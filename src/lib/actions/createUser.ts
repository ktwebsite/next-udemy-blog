"use server"
import { signIn } from '@/auth';
import { prisma } from '@/lib/prisma';


import { registerSchema } from "@/validations/user"
import bcryptjs from "bcryptjs"
import { redirect } from 'next/navigation';
// バリデーションエラー処理
function handleValidationError(error: any): ActionState {
 const { fieldErrors, formErrors } = error.flatten();
 // zodの仕様でパスワード一致確認のエラーは formErrorsで渡ってくる
// formErrorsがある場合は、confirmPasswordフィールドにエラーを追加
 if (formErrors.length > 0) {
 return { success: false, errors: { ...fieldErrors, confirmPassword: formErrors
 }}}
 return { success: false, errors: fieldErrors };
}
// カスタムエラー処理
function handleError(customErrors: Record<string, string[]>): ActionState {
 return { success: false, errors: customErrors };
}

type ActionState = {
  success: boolean,
  errors: Record<string, string[]>
}
export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawFormData = Object.fromEntries(
    ["name","email","password","confirmPassword"].map((field)=>[
      field,
      formData.get(field) as string
    ])
  ) as Record<string, string>

  const validationResult = registerSchema.safeParse(rawFormData)
  if(!validationResult.success){
    return handleValidationError(validationResult.error)
  }
  const existingUser = await prisma.user.findUnique({
    where : {email: rawFormData.email}
  })
  if(existingUser){
    return handleError({email: ["このメールアドレスは既に登録されています"]})
  }

  const hashedPassword = await bcryptjs.hash(rawFormData.password, 12)

  await prisma.user.create({
    data: {
      name: rawFormData.name,
      email: rawFormData.email,
      password: hashedPassword
    }
  })
  await signIn('credentials', {
        ...Object.fromEntries(formData),
        redirect: false
      });

       redirect("/dashboard")


}
