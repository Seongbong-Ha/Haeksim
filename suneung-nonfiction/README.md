# Backend - AI 수능 비문학 학습 플랫폼

## 📖 개요

FastAPI 기반의 AI 수능 비문학 학습 플랫폼 백엔드입니다. OpenAI API와 RAG(Retrieval Augmented Generation) 기술을 활용하여 지문 생성, 문제 분석, 요약 평가 등의 AI 기능을 제공합니다.

## 🛠 기술 스택

### 웹 프레임워크
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Pydantic**: 데이터 검증 및 설정 관리

### AI & 머신러닝
- **OpenAI API**: GPT 모델을 활용한 텍스트 생성 및 분석
- **LangChain**: LLM 애플리케이션 개발 프레임워크 (예정)
- **Sentence Transformers**: 텍스트 임베딩 생성
- **FAISS/ChromaDB**: 벡터 검색 엔진

### 데이터베이스
- **SQLAlchemy**: ORM (Object-Relational Mapping)
- **PostgreSQL**: 메인 데이터베이스 (프로덕션)
- **SQLite**: 개발 환경 데이터베이스

### 인증 & 보안
- **JWT**: JSON Web Token 기반 인증
- **bcrypt**: 비밀번호 해싱
- **python-jose**: JWT 토큰 처리

## 🚀 시작하기

### 사전 요구사항
- Python 3.8 이상
- PostgreSQL (프로덕션 환경)
- OpenAI API Key

### 설치 및 실행

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 필요한 값들 설정

# 데이터베이스 초기화
python -c "from app.db_sql import Base, engine; Base.metadata.create_all(bind=engine)"

# 서버 실행
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 환경 변수

`.env` 파일에 다음 변수들을 설정하세요:

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost/dbname
# 개발 환경에서는 SQLite 사용: sqlite:///./app.db

# JWT 인증
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 설정
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 🏗 프로젝트 구조

```
app/
├── __init__.py              # FastAPI 앱 설정 및 라우터 등록
├── models.py                # SQLAlchemy 데이터베이스 모델
├── schemas.py               # Pydantic 스키마 (요청/응답 모델)
├── schemas_auth.py          # 인증 관련 스키마
├── db_sql.py               # 데이터베이스 연결 설정
├── auth_core.py            # JWT 인증 로직
├── routers/                # API 라우터 모듈
│   ├── auth.py             # 인증 (로그인/회원가입)
│   ├── generate.py         # AI 지문 생성
│   ├── items.py            # 문제 관리 (저장/조회)
│   ├── analysis.py         # 학습 분석
│   ├── chat.py             # AI 튜터 채팅
│   ├── rag_similar.py      # RAG 유사 문서 검색
│   └── summary.py          # 요약 분석 및 평가
└── data/                   # 학습 데이터 및 인덱스
    ├── nonfiction/         # 원본 비문학 데이터
    └── out/index/          # 벡터 인덱스 파일
```

## 🔌 API 엔드포인트

### 인증 (`/auth`)
- `POST /auth/signup` - 회원가입
- `POST /auth/login` - 로그인
- `GET /auth/me` - 사용자 정보 조회

### 지문 생성 (`/api/v1`)
- `POST /api/v1/items/generate` - AI 지문 생성
- `POST /api/v1/items` - 생성된 지문 저장
- `GET /api/v1/items` - 저장된 지문 목록 조회

### 문제 풀이
- `POST /api/v1/submit` - 답안 제출 및 분석
- `GET /api/v1/analysis/{user_id}` - 학습 분석 데이터

### 요약 기능 (`/api/v1/summary`)
- `POST /api/v1/summary/analyze` - 요약문 분석
- `POST /api/v1/summary/save` - 요약 저장
- `GET /api/v1/summary/list` - 저장된 요약 목록
- `POST /api/v1/summary/chat` - 요약 관련 AI 채팅

### RAG 검색
- `POST /api/v1/rag/similar` - 유사 문서 검색
- `POST /api/v1/rag/rewrite` - 쿼리 리라이트

### AI 채팅
- `POST /api/v1/chat` - AI 튜터와 대화

## 🤖 AI 모델 아키텍처

### 1. 지문 생성 시스템

#### RAG 파이프라인
```python
# 1. 쿼리 리라이트
rewritten_query = rewrite_query(current_passage, difficulty_reason)

# 2. 벡터 검색
similar_docs = vector_search(rewritten_query, top_k=5)

# 3. 컨텍스트 기반 생성
generated_passage = llm_generate_passage(
    topic=topic, 
    difficulty=difficulty,
    context=similar_docs
)
```

#### 품질 관리
- **문법 검사**: 생성된 텍스트의 문법적 정확성 검증
- **난이도 조절**: 어휘 수준과 문장 복잡도 자동 조정
- **중복 제거**: 기존 데이터와의 유사도 검사

### 2. 문제 분석 시스템

#### 근거 분석
```python
def analyze_evidence(choice_text: str, evidence: str, passage: str) -> dict:
    """선지에 대한 근거의 품질을 분석"""
    analysis = {
        "accuracy": 0,      # 정확성 (0-100)
        "logic": 0,         # 논리성 (0-100)
        "relevance": 0,     # 관련성 (0-100)
        "completeness": 0,  # 완성도 (0-100)
        "feedback": ""      # 상세 피드백
    }
    return analysis
```

#### 학습 패턴 분석
- **강약점 파악**: 주제별, 유형별 정답률 분석
- **사고 과정 추적**: 근거 작성 패턴을 통한 사고력 평가
- **개선 방향 제시**: 개인화된 학습 권장사항

### 3. 요약 평가 시스템

#### 평가 지표
```python
class SummaryScores(BaseModel):
    coverage: int = Field(ge=0, le=100)      # 내용 포괄성
    correctness: int = Field(ge=0, le=100)   # 정확성
    coherence: int = Field(ge=0, le=100)     # 논리적 일관성
    language: int = Field(ge=0, le=100)      # 언어 사용
    overall: int = Field(ge=0, le=100)       # 종합 점수
```

#### 평가 알고리즘
- **핵심 내용 추출**: 원문에서 중요 개념과 논리 구조 파악
- **비교 분석**: 학습자 요약과 원문 간의 일치도 측정
- **언어 품질**: 문법, 어휘 사용, 문체의 적절성 평가

### 4. AI 튜터 시스템

#### 소크라테스식 대화
```python
def generate_socratic_response(user_question: str, context: dict) -> str:
    """즉답 대신 유도 질문으로 응답"""
    prompt = f"""
    학생 질문: {user_question}
    맥락: {context}
    
    즉답하지 말고, 학생이 스스로 답을 찾을 수 있도록 
    단계적 유도 질문을 생성하세요.
    """
    return openai_chat_completion(prompt)
```

## 🗃 데이터베이스 모델

### User (사용자)
```python
class User(Base):
    id: int                    # 기본키
    username: str              # 사용자명 (유니크)
    email: str                 # 이메일 (유니크)
    password_hash: str         # 해시된 비밀번호
    created_at: datetime       # 가입일시
    submissions: List[Submission]  # 제출 기록
```

### Item (문제)
```python
class Item(Base):
    id: str                    # 문제 ID
    title: str                 # 제목
    question: str              # 문제 텍스트
    generated_passage: str     # AI 생성 지문
    sentences_json: str        # 문장별 분할 데이터
    quality_json: str          # 품질 평가 결과
    topic: str                 # 주제
    difficulty: str            # 난이도
    choices: List[Choice]      # 선지 목록
```

### Choice (선지)
```python
class Choice(Base):
    id: int                    # 기본키
    item_id: str              # 문제 ID (외래키)
    index: int                # 선지 번호 (0, 1, 2, 3, 4)
    text: str                 # 선지 텍스트
    is_correct: bool          # 정답 여부
    evidence_sent_ids_json: str  # 근거 문장 ID
    verify_label: str         # 검증 결과
```

### Submission (제출)
```python
class Submission(Base):
    id: int                    # 기본키
    user_id: int              # 사용자 ID (외래키)
    item_id: str              # 문제 ID (외래키)
    choice_index: int         # 선택한 선지
    correct: bool             # 정답 여부
    explain: str              # 근거 설명
    evidence_sent_ids_json: str  # 근거 문장
    created_at: datetime      # 제출 시간
```

### Summary (요약)
```python
class Summary(Base):
    id: str                    # 요약 ID
    user_id: int              # 사용자 ID (외래키)
    title: str                # 제목
    passage: str              # 원문
    my_summary: str           # 작성한 요약
    scores_json: str          # 평가 점수
    key_points_json: str      # 핵심 포인트
    evaluated_feedback: str   # AI 피드백
    created_at: datetime      # 작성 시간
```

## 🔐 인증 및 보안

### JWT 토큰 관리
```python
def create_access_token(username: str) -> str:
    """JWT 토큰 생성"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> str:
    """JWT 토큰 검증 및 사용자명 추출"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
```

### 비밀번호 보안
```python
def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """비밀번호 검증"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```

### API 보안
- **CORS 설정**: 허용된 도메인에서만 접근 가능
- **Rate Limiting**: API 호출 빈도 제한 (예정)
- **Input Validation**: Pydantic을 통한 입력 데이터 검증

## 📊 성능 최적화

### 데이터베이스 최적화
- **인덱싱**: 자주 조회되는 컬럼에 인덱스 설정
- **쿼리 최적화**: N+1 문제 방지를 위한 eager loading
- **커넥션 풀링**: SQLAlchemy 엔진의 커넥션 풀 활용

### AI 모델 최적화
- **캐싱**: 자주 사용되는 응답 결과 캐싱
- **배치 처리**: 여러 요청을 묶어서 처리
- **비동기 처리**: FastAPI의 async/await 활용

### 메모리 관리
- **벡터 인덱스 최적화**: FAISS를 통한 효율적인 유사도 검색
- **임베딩 캐싱**: 자주 사용되는 텍스트 임베딩 캐시

## 🧪 테스트

### 테스트 구조
```
tests/
├── test_auth.py            # 인증 관련 테스트
├── test_generate.py        # 지문 생성 테스트
├── test_analysis.py        # 분석 기능 테스트
├── test_models.py          # 데이터베이스 모델 테스트
└── conftest.py            # 테스트 설정 및 픽스처
```

### 테스트 실행
```bash
# 모든 테스트 실행
pytest

# 커버리지 포함 실행
pytest --cov=app

# 특정 테스트 파일 실행
pytest tests/test_auth.py

# 테스트 환경에서 API 서버 실행
pytest --testmon
```

### 테스트 종류
- **단위 테스트**: 개별 함수와 클래스 테스트
- **통합 테스트**: API 엔드포인트 전체 플로우 테스트
- **성능 테스트**: AI 모델 응답 시간 측정

## 📈 모니터링 및 로깅

### 로깅 설정
```python
import logging

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# API 요청 로깅
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
```

### 성능 메트릭
- **응답 시간**: 각 API 엔드포인트별 평균 응답 시간
- **AI 모델 성능**: OpenAI API 호출 시간 및 토큰 사용량
- **데이터베이스 성능**: 쿼리 실행 시간 및 커넥션 풀 상태

## 🚀 배포

### Docker 컨테이너
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 환경별 설정
- **개발**: SQLite + Debug 모드
- **스테이징**: PostgreSQL + 로깅 강화
- **프로덕션**: PostgreSQL + 성능 최적화 + 모니터링

### CI/CD 파이프라인
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run tests
        run: pytest
      - name: Deploy to production
        run: echo "Deploy to cloud provider"
```

## 🔧 개발 도구

### 코드 품질
- **Black**: 자동 코드 포맷팅
- **isort**: import 구문 정리
- **flake8**: 코드 스타일 검사
- **mypy**: 타입 체크 (예정)

### API 문서
- **Swagger UI**: `/docs` 엔드포인트에서 자동 생성
- **ReDoc**: `/redoc` 엔드포인트에서 대안 문서

### 개발 명령어
```bash
# 코드 포맷팅
black app/
isort app/

# 코드 검사
flake8 app/

# 데이터베이스 마이그레이션 (Alembic 사용 시)
alembic upgrade head
```

## 🐛 트러블슈팅

### 일반적인 문제

1. **OpenAI API 오류**
   - API 키 확인
   - 토큰 사용량 제한 확인
   - 네트워크 연결 상태 확인

2. **데이터베이스 연결 오류**
   - DATABASE_URL 환경 변수 확인
   - PostgreSQL 서버 상태 확인
   - 권한 설정 확인

3. **메모리 부족**
   - 벡터 인덱스 크기 조정
   - 배치 크기 줄이기
   - 캐시 메모리 정리

4. **응답 시간 지연**
   - AI 모델 호출 최적화
   - 데이터베이스 쿼리 튜닝
   - 캐싱 전략 적용

## 📈 향후 개선 사항

### 기능 개선
- **실시간 학습 분석**: WebSocket 기반 실시간 피드백
- **개인화 추천**: 협업 필터링 기반 문제 추천
- **다중 모델 지원**: 다양한 LLM 모델 선택 기능

### 성능 개선
- **캐싱 계층**: Redis 기반 분산 캐시
- **로드 밸런싱**: 다중 서버 환경 지원
- **비동기 처리**: Celery 기반 백그라운드 작업

### 확장성
- **마이크로서비스**: 기능별 서비스 분리
- **API 버저닝**: 하위 호환성 유지
- **국제화**: 다국어 지원 기능
