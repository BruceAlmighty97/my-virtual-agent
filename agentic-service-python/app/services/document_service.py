import boto3
import pdfplumber
import io

class DocumentService:
    def __init__(self):
        print("Document Service Initialized")
        self.s3_client = boto3.client('s3')
        self.bucket_name = 'gbh-virtual-agent-documents'
        self.document_text = {}

        response = self.s3_client.list_objects_v2(Bucket=self.bucket_name)
        if "Contents" in response:
            for obj in response["Contents"]:
                if obj["Key"].endswith(".pdf"):
                    file_key = obj["Key"]
                    pdf_text = self.get_document_text_from_pdf(file_key)
                    self.document_text[file_key] = pdf_text

        print(self.document_text)

    def get_document_text_from_pdf(self, file_key: str):
        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_key)
        pdf_bytes = response["Body"].read()
        pdf_stream = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_stream) as pdf:
            pdf_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        return pdf_text
    
    def get_doucment_text(self):
        return self.document_text