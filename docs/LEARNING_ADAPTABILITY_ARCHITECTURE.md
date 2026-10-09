# Cela.sh — Learning & Adaptability Governance Baseline

> **الحالة:** مسودة معمارية وحوكمة للمراجعة البشرية؛ ليست دليلًا على وجود تعلم
> مستمر أو reinforcement learning أو تعديل تلقائي للنموذج.
>
> **التاريخ:** 2026-10-08
>
> **النطاق:** تحسين النموذج أو prompts أو السياسات أو بيانات المعرفة بمرور الوقت،
> والتكيف مع تغير البيئة، دون السماح بتعلم إنتاجي ذاتي غير خاضع للمراجعة.

## 1. القرار الحاكم

لا يعتمد Cela.sh **online learning** من تفاعلات المستخدم، ولا يغير model weights أو
prompts أو سياسات الأمان أو الصلاحيات تلقائيًا في الإنتاج. المسار الافتراضي لأي
تحسين هو دورة **offline، محددة الإصدار، قابلة للتقييم والرجوع، وبموافقة بشرية**.

```text
Observe → Curate → Evaluate → Approve → Limited rollout → Monitor → Roll back/Promote
```

لا تُعد المحادثة أو زر الإعجاب أو نجاح الطلب مكافأة صحيحة تلقائيًا، ولا يُستخدم أي
منها للتدريب دون غرض وأساس قانوني وموافقة وحوكمة بيانات منفصلة.

الأولويات:

1. منع feedback loops والتدهور الصامت.
2. حماية الخصوصية والحقوق قبل جمع إشارات التعلم.
3. فصل الرصد عن التعديل؛ اكتشاف drift لا يفعّل retraining آليًا.
4. قياس الجودة والسلامة والإنصاف والتكلفة معًا.
5. إبقاء نسخة معروفة قابلة للاستعادة وkill switch.

حالة continuous/online learning وreinforcement learning: `NOT_APPROVED`.

## 2. ما الذي يمكن أن يتكيف؟

يجب فصل طبقات التغيير لأن مخاطرها مختلفة:

| الطبقة | مثال | مسار التغيير |
|---|---|---|
| إعداد تشغيل | timeout أو حد حجم | configuration version + tests + approval |
| Prompt/system instruction | صياغة أو سياسة إجابة | prompt version + evaluation + review |
| Workflow/policy | قرار أداة أو تصعيد | code/policy review + security tests |
| Retrieval corpus | إضافة/حذف مستند | data pipeline + ACL + freshness + evaluation |
| Ranking/routing | اختيار مسار أو نموذج | offline policy evaluation + guarded rollout |
| Fine-tuned weights | ضبط نموذج | governed dataset + training/evaluation gate |
| Base model/provider | إصدار أو مزود جديد | full regression + privacy/cost/legal review |
| User personalization | تفضيل لغة/عرض | explicit controls + scoped storage + deletion |

لا يُخفى تغيير سلوكي داخل configuration غير مراجع. كل طبقة لها owner وإصدار وسبب
وmetrics وخطة rollback.

## 3. مستويات التعلم المسموحة

### المستوى 0: لا تعلم

السلوك الحالي: كود وإعدادات ثابتة وDemo معلّم أو model adapter اختياري. لا تُستخرج
ذاكرة دائمة من المحادثات.

### المستوى 1: تحليل offline

يجوز تحليل بيانات صناعية أو مجموعة تقييم معتمدة لاكتشاف فجوات، دون تغيير إنتاجي.
البيانات الحقيقية تحتاج موافقة وخصوصية وتقليلًا وتنقيحًا.

### المستوى 2: تحديث بشري مضبوط

يعدل المطور prompt أو قاعدة أو dataset version في Git/registry، ثم تمر الاختبارات
والمراجعة وrollout المحدود. هذا هو المسار المقترح لأول تحسين فعلي.

### المستوى 3: اقتراح آلي وموافقة بشرية

قد يقترح النظام تغييرات، لكن لا ينشرها. المقترح يُعامل كمدخل غير موثوق ويحتاج
مراجعة واختبارات مستقلة.

### المستوى 4: تعلم online محدود

تغيير آلي من traffic الحقيقي مع guardrails وrollback. حالته `NOT_APPROVED` ويحتاج
نضجًا تشغيليًا وقانونيًا غير موجود.

### المستوى 5: وكيل ذاتي أو RL مفتوح

اختيار أهداف وأفعال ومكافآت وتغيير سياسات دون موافقة لكل إصدار. حالته
`PROHIBITED` للنطاق الحالي.

## 4. حلقة التحسين المستمر المضبوطة

### 4.1 الملاحظة

- جودة وفشل ورفض وtimeout وlatency وتكلفة حسب operation.
- drift في اللغة والمهام والمدخلات والمصادر.
- feedback صريح مع سياق محدود وموافقة مناسبة.
- حوادث وشكاوى واعتراضات وتجاوزات بشرية.
- تغير إصدار المزود أو شروطه أو نموذج alias.

الرصد لا يجمع prompts أو ردودًا افتراضيًا، ولا يستخدم معرفات شخصية كأبعاد metrics.

### 4.2 فرز المشكلة

قبل “إعادة التدريب” يُحدد السبب المحتمل:

- bug في التطبيق أو validation.
- prompt أو policy غير واضح.
- بيانات معرفة قديمة.
- فشل retrieval أو permission filtering.
- تغير provider/model.
- نقص تقييم أو تغير population.
- مشكلة UX أو ترجمة أو accessibility.
- حاجة فعلية إلى fine-tuning.

يُختار أصغر إصلاح آمن؛ لا يُستخدم التعلم لتعويض bug أو صلاحيات خاطئة.

### 4.3 إعداد المرشح

كل candidate يملك:

- معرفًا وإصدارًا ومالكًا وفرضية تغيير.
- diff قابلًا للمراجعة للكود/prompt/config/data.
- dataset/evaluation version وحقوق استخدام.
- expected benefit ومخاطر وشرائح متأثرة.
- حدود تكلفة وموارد.
- rollback artifact ومعيار إيقاف.

### 4.4 التقييم والموافقة

- offline evaluation على frozen set ومجموعة حديثة منفصلة.
- safety/fairness/privacy/security regression.
- جودة العربية واللهجات والإنجليزية.
- latency/token/unit-cost comparison.
- مراجعة بشرية للحالات المتدهورة، لا المتوسط فقط.
- موافقات حسب مستوى الخطر.

### 4.5 الإطلاق والمراقبة

- shadow أو canary عندما تكون البنية والخصوصية معتمدتين.
- traffic allocation ثابت ومحدود، لا يتوسع ذاتيًا دون بوابة.
- guardrail metrics وautomatic rollback فقط لقواعد محددة وآمنة.
- عدم تعريض نفس المستخدم لسلوك متناقض في قرار حساس.
- promotion يدوي بعد نافذة ومراجعة، لا بمجرد تحسن metric واحدة.

## 5. بيانات التعلم والتغذية الراجعة

- محادثات المستخدم ليست training data افتراضيًا.
- opt-in، إن كان مناسبًا قانونيًا، منفصل وواضح وقابل للسحب.
- feedback thumbs-up/down إشارة noisy ومنحازة، وليس reward أو label كافيًا.
- عدم الاستجابة قد تعني مغادرة أو نجاحًا أو مشكلة شبكة؛ لا تفسر كمكافأة.
- النقر ومدة الجلسة قد يدفعان engagement لا الجودة أو السلامة.
- abuse reports والحوادث تُعالج لغرضها ولا تنتقل للتدريب تلقائيًا.
- feedback dataset له provenance وretention وdeduplication وتمثيل وحقوق حذف.
- لا استخدام لـ`sync/` أو `vault/` أو logs أو analytics للتعلم تلقائيًا.

تفاصيل الجودة والتمثيل والتحديث تتبع `DATA_QUALITY_ARCHITECTURE.md`.

## 6. التكيف مع تغير البيئة

### 6.1 أنواع التغير

- data/schema/concept drift.
- تغير اللغة واللهجات وأنواع المهام.
- تغير قوانين وسياسات ومصادر معرفة.
- تغير API المزود أو model alias أو limits والأسعار.
- تغير threat landscape وأساليب prompt injection.
- تغير الأجهزة والمتصفحات والشبكات.
- تغير الحمل والتكلفة وSLO.

### 6.2 استراتيجية التكيف

- schema drift يفشل إلى quarantine؛ لا mapping تخميني صامت.
- model/provider change يشغّل regression suite كاملة.
- معرفة زمنية تحمل effective/expiry dates ومالك freshness.
- prompts والسياسات بإصدارات مستقلة مع compatibility notes.
- feature flags مؤقتة بمالك وتاريخ إزالة، ولا تتجاوز الأمان.
- thresholds لا تتغير ذاتيًا من traffic دون مراجعة أثر.
- خارج نطاق الدعم يؤدي إلى abstain/escalate بدل جواب واثق.
- التكيف لا يوسع permissions أو data access تلقائيًا.

## 7. اكتشاف drift

المؤشرات المرشحة:

- تغير distributions للغة والطول ونوع المهمة ومصدر المعرفة.
- validation failure وunknown enum/schema rates.
- تغير success/error/abstention/escalation rates.
- جودة على مجموعة تقييم حديثة موثقة.
- performance حسب الشرائح مع confidence intervals.
- retrieval recall وcitation correctness إذا اعتمد RAG.
- token usage وlatency/unit cost و429.
- تغير model identifier أو response contract.

القواعد:

- baseline وإطار زمني وحجم عينة قبل threshold.
- statistical alert لا يساوي ضررًا أو يبرر retraining؛ يبدأ التحقيق.
- لا sensitive attributes للرصد دون ضرورة ومشروعية وضمانات.
- كل alert له owner وrunbook وشروط إغلاق.
- false alerts وموسمية البيانات تُراجع.

Drift thresholds وcadence: `NOT_DEFINED`.

## 8. Prompt وPolicy Lifecycle

يُعامل prompt كartifact سلوكي:

- محفوظ بإصدار ومراجعة، لا نصًا مجهولًا في لوحة مزود.
- purpose وinputs/outputs واللغة والسياسات والحدود موثقة.
- لا أسرار أو بيانات مستخدم ثابتة داخله.
- اختبارات حقن وتعليمات متعارضة وmultilingual regressions.
- مقارنة المرشح بالنسخة الحالية على نفس evaluation set.
- لا prompt optimizer ينشر مباشرة للإنتاج.
- rollback فوري إلى إصدار معروف.
- فصل policy غير القابلة للتجاوز عن نص المستخدم والمحتوى المسترجع.

Prompt registry/tooling: `NOT_DECIDED`؛ لا خدمة أو dependency قبل الحاجة.

## 9. RAG وتحديث المعرفة

RAG غير منفذ. إذا اعتمد مستقبلًا:

- corpus versions immutable ومصدر/ترخيص/ACL/freshness لكل مستند.
- ingestion إلى quarantine مع malware وschema وprivacy checks.
- تحديث index ذري أو blue/green لمنع نسخة مختلطة.
- الحذف وسحب الصلاحية يصلان إلى chunks والembeddings والcache.
- evaluation قبل promotion: retrieval وgroundedness وcitation accuracy.
- rollback إلى index سابق مع استثناء بيانات يجب حذفها قانونيًا.
- لا تعلم weights من corpus لمجرد أنه متاح للاسترجاع.
- content feedback لا يغير ranking ذاتيًا قبل تقييم الانحياز والسمّية.

Vector store وembedding model والتحديث التلقائي: `NOT_APPROVED`.

## 10. Fine-tuning وإعادة التدريب

Fine-tuning ليس الخطوة الافتراضية. قبل الموافقة يجب إثبات أن المشكلة لا يحلها:

- إصلاح bug أو عقد.
- prompt أو tool/schema أفضل.
- RAG مضبوط للمعرفة المتغيرة.
- validation أو UX أو سياسة واضحة.
- نموذج جاهز مختلف ضمن مراجعة مزود كاملة.

إذا ثبتت الحاجة:

- base model/version وحق الضبط موثقان.
- dataset معتمدة ومرخصة وممثلة ومقسمة بلا leakage.
- baseline ومقاييس قبول وسلامة وإنصاف وتكلفة.
- reproducible training config وseed ومصادر عدم الحتمية.
- checkpoint registry وصلاحيات وتشفير وretention.
- holdout مستقل وred-team ومراجعة مجال.
- model card وrollback ومراقبة بعد الإطلاق.

Fine-tuning/retraining: `NOT_APPROVED`، ولا بنية تدريب أو GPU أو ميزانية معتمدة.

## 11. Reinforcement Learning

### 11.1 المخاطر

RL يحسن reward المعرّفة، لا “القيمة” عمومًا. المخاطر:

- reward misspecification وreward hacking.
- تحسين engagement على حساب الدقة أو الصحة أو الخصوصية.
- feedback loops وتضخيم الأغلبية أو المستخدمين الأكثر نشاطًا.
- exploration يعرّض مستخدمين لأفعال أدنى جودة أو ضارة.
- non-stationarity وصعوبة إعادة إنتاج القرار.
- sparse/delayed rewards ونسب أثر لشخص/فعل خاطئ.
- تضخم التكلفة والأدوات والاستدعاءات لتحقيق reward.
- policy drift يصعب تدقيقه أو تفسيره.

### 11.2 شروط أي تجربة RL مستقبلية

- use case منخفض المخاطر وبيئة sandbox أو simulation أولًا.
- action space محدود وقابل للعكس ولا يوسع الصلاحيات.
- reward متعدد الأبعاد يشمل السلامة والجودة والتكلفة والإنصاف، مع hard constraints.
- offline policy evaluation وcounterfactual limitations موثقة.
- no exploration على قرارات حساسة أو بيانات غير موافق عليها.
- human approval لكل policy version وbounded rollout.
- immutable logs منقحة، reproducibility، off-switch وrollback.
- independent safety/fairness review وموافقة قانونية عند الحاجة.

RL/RLHF/RLAIF الإنتاجي: `NOT_APPROVED`. لا تُعامل تقييمات نموذج آخر كحقيقة بشرية
ولا feedback المستخدم كمكافأة مباشرة.

## 12. Contextual Bandits وA/B Testing

حتى الاختيار البسيط بين بدائل قد يكون تعلمًا تكيفيًا:

- A/B hypothesis ومقياس أساسي وguardrails وحجم عينة ومدة قبل البدء.
- assignment مستقر ومنع تداخل التجارب.
- لا تجربة خفية تغير قرارًا عالي الأثر أو شروط الخصوصية.
- stopping rules مسبقة لمنع peeking واختيار نتيجة مصادفة.
- قياس الشرائح والأضرار، لا conversion العام فقط.
- bandit يحتاج bounded actions وexploration floor/ceiling وrollback.
- لا تحسين click/retention إذا كان يناقض الجودة أو wellbeing.

A/B platform وbandits: `NOT_IMPLEMENTED / NOT_APPROVED`.

## 13. التخصيص والذاكرة

التكيف مع المستخدم لا يعني ذاكرة خفية:

- preferences صريحة مثل اللغة أو theme يمكن حفظها محليًا وفق سياسة واضحة.
- persona/profile مستنتج من المحادثات غير معتمد.
- لا cross-session memory لمحتوى المحادثة دون opt-in وغرض وحذف.
- memory scoped للمستخدم/tenant ولا تنتقل إلى آخر.
- المستخدم يرى ويصحح ويحذف ما حُفظ عند تنفيذ الميزة.
- بيانات حساسة لا تُستنتج أو تحفظ لمجرد التخصيص.
- personalization لا يغير safety policy أو permissions أو السعر سرًا.
- cold-start fallback صادق ولا يختلق معرفة بالمستخدم.

Long-term AI memory: `NOT_APPROVED`.

## 14. التقييم متعدد الأهداف

لا يروّج تغيير بناءً على metric واحدة. scorecard المرشح:

- task quality/factuality.
- safety/refusal correctness.
- fairness/worst-group performance.
- privacy leakage.
- human preference بعد ضبط جودة العينة.
- latency/reliability.
- input/output tokens وunit cost.
- accessibility/usability.
- abstention/escalation appropriateness.

ترتيب الأولويات: hard safety/privacy/legal constraints أولًا، ثم thresholds الدنيا،
ثم تحسين Pareto بين الجودة والتكلفة والسرعة. لا يعوض تحسن المتوسط انتهاك constraint.

## 15. Champion/Challenger وRollout

- champion نسخة إنتاج معروفة ومحددة، لا alias متحرك غير مراقب قدر الإمكان.
- challenger لا يرى أسرارًا أو بيانات أوسع من champion.
- shadow output لا يُعرض أو ينفذ أثرًا خارجيًا، وتخزينه يخضع للخصوصية.
- canary traffic محدود مع assignment وتحليل واضحين.
- automated rollback على أخطاء تشغيلية محددة؛ قرارات الجودة المعقدة تحتاج مراجعة.
- rollback artifact/config/data متوافق، مع حماية طلبات الحذف.
- promotion يسجل من وافق والدليل والإصدار والتاريخ.

لا توجد بنية champion/challenger حالية: `NOT_IMPLEMENTED`.

## 16. منع التدهور والكوارث

- immutable versions وchecksums للكود/prompt/data/model config.
- kill switch يوقف القدرة المكلفة أو الخطرة دون تعطيل التشخيص الآمن.
- limits للحصة والتكلفة والأفعال والأدوات.
- لا self-modifying code أو كتابة agent إلى production config.
- لا وصول training job إلى أسرار أو صلاحيات الإنتاج غير اللازمة.
- rollback rehearsed قبل online adaptation.
- incident response لتدهور الجودة أو الانحياز أو الخصوصية أو الإنفاق.
- freeze للتعلم والتجارب عند استهلاك error/risk budget.

## 17. الخصوصية والأمن

- purpose limitation: telemetry للتشغيل لا تصبح training data تلقائيًا.
- data minimization وretention وحذف وlineage للمشتقات.
- user deletion يشمل feedback/dataset derivatives وفق السياسة والانطباق.
- poisoning/Sybil attacks تمنع اعتبار كثرة feedback حقيقة.
- provenance وauthentication لمصادر التحديث.
- training/evaluation environments معزولة ومحدودة الصلاحية.
- artifacts مشفرة ولا تدخل Git أو browser أو logs.
- membership inference/model extraction risks تُقيّم عند fine-tuning أو API عامة.

لا تعلم من بيانات شخصية أو صحية قبل تقييم قانوني وأمني صريح.

## 18. المسؤولية والموافقات

الأدوار المطلوبة:

- Product Owner: الغرض وقيمة التغيير.
- Data Owner/Steward: البيانات والحقوق والجودة.
- ML/System Owner: المرشح والتقييم وإعادة الإنتاج.
- Safety/Fairness Reviewer: الضرر والشرائح والحدود.
- Security/Privacy/Legal Reviewers: الوصول والأساس القانوني.
- Operations Owner: rollout والمراقبة وrollback والحوادث.
- Human Approver: قرار promotion النهائي.

كلها `NOT_ASSIGNED` حاليًا. لا يُسمح لـautomated evaluator أن يكون المقترح والمقيّم
والمعتمد الوحيد.

## 19. الاختبارات المطلوبة

- regression للعقد والسلوك متعدد اللغات.
- frozen وfresh evaluation sets بلا leakage.
- drift detector false-positive/negative behavior.
- prompt/policy/data/model version compatibility.
- fairness/safety/privacy/security suites.
- poisoning، feedback manipulation، reward hacking، prompt injection.
- rollback وkill switch وpartial rollout failure.
- reproducibility من manifests وchecksums.
- cost/token/latency تحت الحمل.
- deletion propagation وconsent withdrawal.
- human review وappeal workflows عند انطباقها.

mock لا يثبت model behavior، وoffline improvement لا يثبت online impact. غياب تجربة
مصرح بها يعني `NOT_TESTED`.

## 20. سجل القرارات

| القرار | الحالة | المطلوب للحسم |
|---|---|---|
| Offline human-approved improvement | `PROPOSED` | versioning وتقييم وملاك وrollback |
| Online/continuous learning | `NOT_APPROVED` | بيانات وموافقة وmaturity وguardrails وتجارب |
| Automated prompt optimization | `NOT_APPROVED` | sandbox وتقييم مستقل وعدم نشر تلقائي |
| Fine-tuning/retraining | `NOT_APPROVED` | حاجة وdataset مرخصة وbaseline وبنية وميزانية |
| RL/RLHF/RLAIF إنتاجي | `NOT_APPROVED` | use case ومكافأة وضوابط وتجربة قانونية/أخلاقية |
| Agent self-modification | `PROHIBITED` | خارج النطاق المقبول |
| A/B testing/bandits | `NOT_IMPLEMENTED` | منصة وخصوصية وإحصاء وguardrails |
| RAG auto-refresh | `NOT_APPROVED` | corpus وACL وquality gate وrollback |
| Long-term user memory | `NOT_APPROVED` | opt-in وغرض وتحكم وحذف وأمن |
| Drift thresholds | `NOT_DEFINED` | baseline ومهمة وحجم عينة وowner |
| Learning readiness | `BLOCKED` | إغلاق بوابات القسم التالي |

## 21. بوابات الجاهزية

### مسموح الآن

- تقييم offline ببيانات صناعية غير حساسة.
- تغييرات prompts/config صغيرة في Git مع اختبارات ومراجعة.
- تعريف metrics وevaluation cards دون جمع بيانات مستخدم.
- مراقبة تشغيلية منقحة لا تُستخدم للتدريب.

### مانع لأي تعلم/تكيف إنتاجي

- لا use case أو reward/metric أو thresholds معتمدة.
- لا dataset/feedback مرخص وموافق عليه وممثل وقابل للحذف.
- لا version registry أو reproducibility أو champion/rollback.
- لا fairness/safety/privacy evaluation أو ملاك واعتماد.
- لا منصة تجارب أو تحليل إحصائي أو guardrails.
- لا hard cost cap وkill switch ومراقبة حوادث.
- مزود النموذج وسياسة بياناته ما زالا غير معتمدين.
- بوابات الأمن والأخلاق وجودة البيانات والنشر العام مفتوحة.

### شرط تغيير الحالة

لا يصبح التعلم المستمر `APPROVED` بمجرد تخزين feedback أو نجاح تجربة offline. يلزم
إثبات حقوق البيانات وجودتها، تعريف هدف لا يشجع الضرر، تقييم مستقل متعدد الأهداف،
إصدار قابل للرجوع، إطلاق محدود، مراقبة وانحياز وخصوصية، وموافقة بشرية لكل policy
version ضمن نطاق محدد.

## 22. العلاقة مع الوثائق الأخرى

- `AI_BACKEND_DESIGN.md`: المزود والنموذج والتكلفة وسياسة البيانات.
- `DATA_QUALITY_ARCHITECTURE.md`: datasets والتمثيل والlineage والتحديث وdrift.
- `AI_ETHICS_ARCHITECTURE.md`: العدالة والإشراف والمساءلة والاعتراض.
- `SECURITY_ARCHITECTURE.md`: الهوية والخصوصية والعزل والأسرار والحوادث.
- `RELIABILITY_ARCHITECTURE.md`: rollout/rollback وSLO وkill switch.
- `SCALABILITY_ARCHITECTURE.md`: الحمل وقيود الموارد والـbackpressure.
- `SUSTAINABILITY_ARCHITECTURE.md`: كلفة التدريب والتقييم والموارد.
- `MAINTAINABILITY_ARCHITECTURE.md`: versioning والاختبارات والتوثيق.

عند التعارض تُقدم السلامة والخصوصية والحقوق والقانون على سرعة التكيف أو metric
الأداء. لا تغير هذه الوثيقة بنية `sync/` أو عقودها أو manifest، ولا تسمح بتحويل
`vault/` أو محادثات المستخدم أو سجلات التشغيل إلى بيانات تعلم تلقائيًا.
