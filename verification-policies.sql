-- Users can read their own verification records
CREATE POLICY "Users can view own verification records"
ON public.verification_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create a verification record only for themselves
CREATE POLICY "Users can insert own verification records"
ON public.verification_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
