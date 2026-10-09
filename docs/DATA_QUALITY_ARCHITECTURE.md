# Cela.sh — Data Quality & Model Data Governance Baseline

> **الحالة:** مسودة حوكمة للمراجعة البشرية؛ ليست دليلًا على امتلاك مجموعة تدريب أو
> تدريب/ضبط نموذج أو خلو البيانات والنموذج من الانحياز.
>
> **التاريخ:** 2026-10-08
>
> **النطاق:** جودة بيانات التدريب أو الضبط أو التقييم أو الاسترجاع مستقبلًا، مع
> فصلها عن بيانات التشغيل والمزامنة الحالية.

## 1. القرار الأساسي

Cela.sh لا يدرب نموذجًا حاليًا، ولا توجد في المستودع مجموعة تدريب معتمدة. الـBackend
المحلي هو adapter لمزود نموذج خارجي اختياري، والدردشة الثابتة تبقى Demo معلّمًا
بوضوح. لذلك لا يجوز وصف بيانات المستخدم أو محتوى Google Drive أو سجلات التشغيل
كـ“بيانات تدريب” تلقائيًا.

قبل أي تدريب أو fine-tuning أو RAG أو evaluation مبني على بيانات حقيقية يلزم مسار
موافقة مستقل يشمل:

1. غرضًا محددًا ومقياس جودة وفشل مقبولًا.
2. مصدرًا وحق استخدام وترخيصًا وأساسًا قانونيًا.
3. تصنيفًا وخصوصية وموافقة واحتفاظًا وحذفًا.
4. schema وvalidation ونسخة dataset قابلة لإعادة الإنتاج.
5. تقييم دقة وتمثيل وانحياز وتسرب بيانات.
6. مراجعة بشرية قبل النشر ومراقبة بعده وخطة rollback.

حالة استخدام البيانات للتدريب أو الضبط: `NOT_APPROVED`.

## 2. تصنيف أنواع البيانات

يجب عدم جمع الفئات التالية تحت كلمة “بيانات” واحدة:

| الفئة | الغرض المحتمل | الحالة الحالية |
|---|---|---|
| بيانات تدريب pre-training | تعلم عام واسع | خارج نطاق المشروع |
| بيانات fine-tuning | تعديل سلوك نموذج محدد | `NOT_APPROVED` |
| بيانات تقييم offline | قياس الجودة والمخاطر | `NOT_DEFINED` |
| بيانات RAG/معرفة | استرجاع معلومات وقت الطلب | `NOT_IMPLEMENTED` |
| محتوى محادثة المستخدم | تنفيذ الطلب وربما حفظ اختياري | ليس تدريبًا افتراضيًا |
| telemetry وسجلات | تشغيل وأمن وتكلفة | منقحة ومحدودة بالغرض |
| بيانات `sync/` المنقحة | نشر قناة المزامنة الحالية | لا تُعاد كتدريب تلقائيًا |
| vault الخام المشفر | غرض المزامنة والاستعادة المحدد | خارج Git ومحظور للتدريب تلقائيًا |
| بيانات صناعية | اختبار العقود والحواف | مسموحة محليًا إذا لم تُعد تعريف أفراد |

كل انتقال من فئة إلى أخرى هو processing purpose جديد يحتاج موافقة وتوثيقًا؛ وجود
البيانات تقنيًا لا يمنح حق استخدامها.

## 3. أبعاد جودة البيانات

### 3.1 الدقة (Accuracy)

مدى مطابقة القيمة للحقيقة أو المرجع المناسب. لا تعني اتفاق المراجعين دائمًا وجود
حقيقة موضوعية، خصوصًا في اللغة أو التفضيل.

### 3.2 الاكتمال (Completeness)

وجود الحقول والأمثلة اللازمة للمهمة، مع فصل “غير معروف” عن قيمة فارغة أو صفر.

### 3.3 الاتساق (Consistency)

تطبيق القواعد والتسميات والوحدات والصيغ نفسها داخل النسخة وعبر المصادر.

### 3.4 الصحة البنيوية (Validity)

مطابقة schema والأنواع والنطاق والتنسيق والقيم المسموحة.

### 3.5 الحداثة (Timeliness/Freshness)

ملاءمة عمر البيانات للمهمة، وليس مجرد تاريخ تعديل حديث.

### 3.6 التفرد (Uniqueness)

منع duplicates أو near-duplicates التي تضخم فئات أو تسرّب بين train/test.

### 3.7 التمثيل (Representativeness)

تغطية التوزيع الحقيقي المتوقع: اللغة واللهجة ونوع المهمة والطول والجهاز والسياق
والفئات المتأثرة، دون تحويل السمات الحساسة إلى collection افتراضي.

### 3.8 provenance وlineage

إمكانية معرفة المصدر والإصدار والتحويلات والمالك والترخيص والموافقات لكل سجل/دفعة.

لا تعتمد درجة جودة واحدة تخفي فشل بُعد حرج؛ تُحدد thresholds حسب use case والمخاطر.

## 4. عقد البيانات (Data Contract)

كل dataset معتمد يحتاج manifest محدد الإصدار يتضمن:

- اسمًا ومعرفًا وsemantic version أو content hash.
- الغرض المسموح والاستخدامات المحظورة.
- المالك وdata steward والمراجعين.
- المصادر وفترة الجمع والمناطق/اللغات المشمولة.
- schema والأنواع والوحدات وnullable/required والقيم المسموحة.
- تعريف label وتعليمات annotation والإصدار.
- الترخيص وحقوق الاستخدام والأساس القانوني والموافقات.
- تصنيف الحساسية وPII/PHI والسياسة الجغرافية.
- إحصاءات الحجم والتوزيع والنواقص والتكرار.
- خطوات التنظيف والترشيح والتنقيح والتحويل.
- train/validation/test split وطريقة منع leakage.
- quality checks ونتائجها والاستثناءات المقبولة.
- retention والحذف وتاريخ المراجعة/الانتهاء.
- checksum لكل artifact وأداة/إصدار البناء.

الـmanifest لا يحتوي raw records أو أسرارًا. لا يوجد حاليًا data-contract format
معتمد لهذا الغرض: `NOT_DECIDED`.

## 5. المصادر والحقوق

قبل ingestion لأي مصدر:

- إثبات الملكية أو الترخيص وشروط الاستخدام وإمكانية التدريب/الاشتقاق صراحة.
- منع scraping لمصدر يحظره العقد أو robots/policy دون مراجعة قانونية.
- توثيق إن كان المصدر عامًا؛ “متاح على الإنترنت” لا يعني مرخصًا للتدريب.
- تسجيل مصدر كل عينة، لا قائمة عامة فقط.
- فحص قيود النقل عبر الحدود وحقوق أصحاب البيانات والحذف.
- منع شراء أو استقبال dataset مجهولة provenance.
- مراجعة open-data licenses والتوافق مع نموذج المنتج والتوزيع.
- حفظ consent scope وإمكانية سحبه إن كان consent هو الأساس.

المصادر المرخصة وDPA/consent model: `NOT_DECIDED`. لا تُجمع بيانات حساسة لمجرد
تحسين التمثيل؛ يلزم ضرورة وتقليل ومراجعة قانونية وأمنية.

## 6. الاستيعاب والتحقق

pipeline البيانات المقترحة منفصلة عن `sync/` الحالية:

```text
Approved Source
    → quarantine
    → schema/security/license validation
    → normalization + provenance
    → deduplication + quality checks
    → human review where required
    → immutable versioned dataset
    → approved split/evaluation artifact
```

القواعد:

- fail closed عند فقد المصدر أو الترخيص أو schema version.
- quarantine لا يُستخدم في تدريب أو تقييم قبل اجتياز البوابات.
- validation يتضمن الحجم والترميز والأنواع والنطاق واللغة والقيم الشاذة.
- malware/format scanning للملفات قبل parsing في بيئة معزولة.
- لا deserialization لصيغ تنفيذية غير موثوقة.
- raw وcurated وderived طبقات منفصلة بصلاحيات وretention مختلفين.
- كل transformation deterministic حيث أمكن ومسجل بإصدار الشيفرة والإعدادات.
- rerun بنفس المدخلات والإصدار يعطي checksum نفسه أو يوثق سبب عدم الحتمية.

لا تُعدل بنية `sync/` أو حالات المزامنة أو manifest الحالي لتنفيذ هذا المسار؛ أي
pipeline تدريب مستقبلية لها تصميم وموافقة منفصلان.

## 7. الدقة والتحقق من الحقيقة

تختلف طريقة الدقة حسب نوع المهمة:

- حقائق منظمة: مقارنة بمصدر مرجعي موثوق ومؤرخ.
- ترجمة/تلخيص: rubric ومراجع متعددة بدل “إجابة ذهبية” وحيدة عند الغموض.
- تصنيف: تعريف labels وأمثلة حدودية وقياس اتفاق المراجعين.
- كود: اختبارات قابلة للتنفيذ وأمنية، لا تشابه نصي فقط.
- بيانات زمنية: تاريخ صلاحية ومصدر وتحديث، مع فصل الحقيقة القديمة عن الخطأ.

متطلبات المراجعة:

- sampling stratified لا عينة سهلة فقط.
- blind review عند تأثير معرفة المصدر أو النموذج في الحكم.
- adjudication للخلافات مع تسجيل السبب وتحديث guideline.
- gold set صغير عالي الجودة للمراقبة، مع حماية من الحفظ/التسرب.
- قياس label error وتباين المراجعين، لا افتراض صحة annotation البشرية.
- إعادة مراجعة عند تغير ontology أو السياسة أو الواقع.

Threshold الدقة ومصدر الحقيقة لكل مهمة: `NOT_DEFINED`.

## 8. كمية البيانات وكفايتها

لا يوجد رقم عام يثبت “كمية كافية”. الكفاية تقاس مقابل المهمة والتوزيع والنموذج:

- learning curves لأداء train/validation مع زيادة البيانات.
- confidence intervals وحجم عينة مناسب للمقاييس والشرائح الحرجة.
- تغطية long-tail والحالات النادرة عالية الأثر.
- diminishing returns مقارنة بكلفة الجمع والمراجعة والتخزين.
- نسبة labels الموثوقة لا العدد الخام فقط.
- تنوع المصادر مع منع التكرار الذي يوهم بزيادة الحجم.
- عدم استخدام test set لتكرار تحسين النموذج حتى يصبح غير مستقل.

تُفضل مجموعة أصغر موثقة وعالية الجودة على حجم كبير مجهول المصدر. Target dataset
size وsampling plan: `NOT_DECIDED` بعد تعريف المهمة والمقياس.

## 9. التمثيل والانحياز

### 9.1 تعريف population المستهدف

قبل قياس التمثيل يجب تحديد:

- البلدان/المناطق المسموح خدمتها.
- العربية الفصحى واللهجات والإنجليزية ومزج اللغات.
- أنواع المهام والسياقات المهنية/العامة.
- أطوال المدخلات ومستويات المعرفة والأجهزة/الاتصال عند ارتباطها بالتجربة.
- الفئات المتأثرة ودرجة خطورة الخطأ.

لا تُخترع نسب population دون مصادر، ولا يُجمع sensitive attribute إذا لم يكن
ضروريًا ومسموحًا.

### 9.2 القياس

- توزيع dataset مقابل population/traffic المصرح قياسه.
- الأداء الكلي وأداء الشرائح مع confidence intervals وحجم العينة.
- false positive/negative أو مقاييس المهمة لكل شريحة عالية الأثر.
- intersectional analysis عندما تسمح البيانات والحجم والخصوصية.
- worst-group performance، لا المتوسط وحده.
- تحليل missingness لأن غياب السمة قد يكون غير عشوائي.
- source concentration لمنع سيطرة مصدر أو لهجة واحدة.

### 9.3 المعالجة

- جمع موجّه للفجوات من مصادر مرخصة بدل تكرار الأغلبية.
- تحسين guideline وannotation عندما يكون الانحياز من labels.
- reweighting/resampling فقط مع توثيق أثره على calibration والجودة.
- لا حذف لغة/فئة صعبة لإخفاء انخفاض المقياس؛ تُعلن حدود الدعم.
- رفض إطلاق use case إذا تعذر خفض ضرر غير مقبول.

لا يمكن ضمان “عدم وجود bias”. الهدف قياس أنواع محددة وتقليلها ومراقبتها والإفصاح
عن القيود. Fairness definitions والشرائح والحدود: `NOT_DECIDED` حسب الاستخدام.

## 10. annotation والوسم

إذا احتاجت المهمة labels بشرية:

- guideline محدد الإصدار بأمثلة إيجابية وسلبية وحدودية.
- تدريب المراجعين واختبار qualification مناسب للمهمة واللغة.
- فصل annotator identity عن dataset المنشورة وحماية بيانات العاملين.
- double annotation لعينة مناسبة وقياس اتفاق مثل Cohen’s kappa أو بديل ملائم، مع
  عدم استخدام المقياس بلا فهم لانتشار الفئات.
- adjudication مستقل للحالات المختلف عليها.
- quality-control items لا تُستخدم لاستغلال العامل أو جمع بيانات خفية.
- تعويض وشروط عمل عادلة وفق السياسة والقانون عند استخدام مراجعين خارجيين.
- مسار اعتراض وتصحيح labels ومراجعة guideline.

استخدام LLM لإنتاج labels مساعدة لا يجعلها ground truth؛ يلزم قياس ضد مراجعة بشرية
ومنع انتقال أخطاء النموذج إلى التقييم.

## 11. إزالة التكرار ومنع التسرب

- exact deduplication عبر hash بعد canonicalization موثق.
- near-duplicate detection للنصوص/الملفات ضمن حدود خصوصية وذاكرة قابلة للقياس.
- split حسب المصدر/المستخدم/الوثيقة/الزمن عندما يمنع ذلك تسربًا واقعيًا.
- عدم وجود نفس المحادثة أو نسخ منها في train وvalidation وtest.
- فحص contamination لمجموعات benchmark العامة قدر الإمكان.
- إبقاء test set محجوبًا عن قرارات الجمع والتنظيف المتكررة.
- منع استخدام production feedback في التدريب ثم تقييم النموذج على نفس feedback.

معايير التشابه وطريقة split: `NOT_DECIDED` بعد تعريف نوع البيانات والمهمة.

## 12. الخصوصية والأمن

- data minimization قبل الجمع، لا مجرد تنقيح لاحق.
- PII/PHI/secrets scanning مع مراجعة false positives/negatives.
- pseudonymization لا توصف anonymization دون تحليل إعادة التعريف.
- تشفير أثناء النقل والتخزين ومفاتيح وصلاحيات منفصلة للraw/curated/test.
- RBAC وtenant isolation وسجلات تدقيق للوصول والتصدير والحذف.
- منع raw data من Git وCI logs وnotebooks والـprompts وأدوات خارجية غير معتمدة.
- بيئات annotation والتقييم لا تسمح بتنزيل واسع دون حاجة.
- data poisoning والتحكم في المصدر والتغييرات جزء من threat model.
- حق الوصول/التصحيح/الحذف يمتد للنسخ والمشتقات والنماذج حسب الانطباق والجدوى
  القانونية والتقنية المراجعة.

HIPAA/GDPR والقانون المصري تحتاج تقييم انطباق؛ لا تُستخدم بيانات شخصية أو صحية
للتدريب قبل موافقة قانونية وأمنية صريحة.

## 13. الإصدارات وقابلية إعادة الإنتاج

كل تجربة أو إصدار نموذج يسجل:

- dataset ID/version/checksum وsplit IDs.
- إصدار الشيفرة والإعدادات والـruntime والتبعيات.
- base model/provider/model version وشروط الخدمة وقت الاستخدام.
- seed ومصادر عدم الحتمية.
- preprocessing/filters/label guideline versions.
- metrics حسب الشرائح مع intervals وفشل الحالات.
- approvers وقرار go/no-go والمخاطر المقبولة.

لا يُستبدل dataset artifact تحت نفس الإصدار. التصحيح ينشئ إصدارًا جديدًا ويربط
بالسابق ويشرح أثره. تخزين artifacts وmodel registry: `NOT_DECIDED`.

## 14. تحديث البيانات وإدارة الحداثة

التحديث المستمر لا يعني ingestion تلقائيًا بلا بوابة. لكل مصدر:

- freshness SLO أو review cadence مرتبط بسرعة تغير المجال.
- owner وتاريخ آخر نجاح وآخر مراجعة للمصدر والترخيص.
- watermark أو cursor موثوق مع idempotent ingestion عند الحاجة.
- schema drift detection وquarantine للتغييرات غير المتوقعة.
- additions/updates/deletions ومعنى كل منها، بما يشمل سحب الموافقة.
- changelog لتوزيع البيانات والlabels والمصادر.
- إعادة تقييم قبل اعتماد النسخة الجديدة.
- rollback إلى dataset/model سابق معروف مع مراعاة طلبات الحذف.

لا تُدفع نسخة جديدة إلى التدريب أو RAG أو الإنتاج لمجرد نجاح fetch. Cadence لكل
مجال وfreshness thresholds: `NOT_DECIDED`.

## 15. Drift والمراقبة

### 15.1 أنواع drift

- **Schema drift:** تغير بنية أو نوع.
- **Data drift:** تغير توزيع المدخلات.
- **Label/concept drift:** تغير العلاقة بين المدخل والنتيجة الصحيحة.
- **Source drift:** تغير مصدر أو سياسة أو جودة.
- **Performance drift:** انخفاض metric فعلي على بيانات حديثة موثوقة.

### 15.2 الرصد

- مقارنة distributions بإصدار مرجعي وشرائح، مع مراعاة حجم العينة.
- freshness وmissingness وduplicates وvalidation failure rate.
- source mix واللغة/اللهجة وأنواع المهمة دون جمع مفرط للهوية.
- feedback موثوق منفصل عن thumbs-up/down الخام الذي قد يكون متحيزًا.
- تنبيه مرتبط بـrunbook ومالك، لا retraining تلقائي أعمى.

Thresholds تحدد من baseline وتأثير المنتج، لا رقم إحصائي عام. اكتشاف drift لا يثبت
أن النموذج أصبح أسوأ؛ يطلق تحليلًا وتقييمًا.

## 16. التقييم قبل وبعد التحديث

بوابة أي dataset/model update:

1. نجاح schema/provenance/license/privacy/security checks.
2. مقارنة إحصاءات الجودة والتمثيل بالإصدار السابق.
3. تقييم frozen test set ومجموعات حديثة منفصلة.
4. تقييم شرائح عالية الأثر وred-team/safety عند انطباقها.
5. مقارنة الجودة والـlatency والتكلفة.
6. مراجعة بشرية للحالات المتدهورة لا المتوسط فقط.
7. canary أو shadow evaluation إذا توفر تشغيل حقيقي مصرح.
8. rollback criteria ومراقبة بعد النشر.

لا يُقبل تحسن aggregate يخفي تدهورًا غير مقبول لشريحة أو مهمة حرجة. معايير
القبول والإيقاف: `NOT_DEFINED`.

## 17. RAG وبيانات المعرفة

RAG غير منفذ حاليًا. إذا اعتمد لاحقًا يحتاج:

- corpus مرخصًا ومحدد النطاق والمالك.
- document/version/effective/expiry metadata.
- chunking يُختبر لاسترجاع المعنى لا بالحجم فقط.
- ACL filtering قبل الاسترجاع وبعده، مع منع cross-tenant leakage.
- حذف وتحديث يصلان إلى index والـcache والنسخ المشتقة.
- قياس retrieval recall/precision وanswer groundedness/citation correctness.
- رفض أو إفصاح عند غياب مصدر مناسب، لا اختلاق إجابة.
- حماية من prompt injection داخل المستندات والروابط والملفات.
- index rebuild قابل للتكرار وrollback.

vector database وembedding model وchunking strategy: `NOT_APPROVED` قبل حاجة
ومراجعة معمارية وخصوصية وتكلفة.

## 18. بيانات المستخدم والتغذية الراجعة

- لا opt-in مدفون أو افتراضي لاستخدام المحادثة في التدريب.
- الموافقة، إن اختيرت قانونيًا، منفصلة وقابلة للسحب وتشرح المزود والغرض والمدة.
- thumbs up/down لا يكفي label للجودة دون سياق ومراجعة الانحياز.
- منع الموظفين أو annotators من رؤية محتوى أكثر من اللازم.
- لا إرسال feedback إلى مزود آخر دون سياسة وقرار جديدين.
- abuse reports والأحداث الأمنية لا تتحول إلى training set تلقائيًا.
- حذف المستخدم يُتتبع عبر dataset lineage والمشتقات وفق السياسة المعتمدة.

نظام feedback واستخدامه في التحسين: `NOT_APPROVED`.

## 19. الأدوار والملكية

قبل تشغيل data pipeline فعلية يلزم تعيين:

- Data Owner: الغرض والمخاطر والاعتماد.
- Data Steward: schema والجودة والlineage والتحديث.
- Security/Privacy reviewers: التصنيف والوصول والأساس القانوني.
- Domain experts: truth source والrubrics والحدود.
- ML owner: التدريب والتقييم والانحياز والrollback.
- Operations owner: pipeline والمراقبة والاستعادة.

الأسماء والـon-call ومسار الاستثناء: `NOT_DECIDED`. لا يحل automation محل مسؤول
بشري عن البيانات.

## 20. الاختبارات والبوابات الآلية

اختبارات مقترحة عند تنفيذ pipeline:

- schema/type/range/required/encoding checks.
- row/file counts وحدود التغير المتوقع.
- missingness/uniqueness/exact وnear-duplicate checks.
- provenance/license/consent completeness.
- PII/secrets/malware scans مع بوابة fail-closed.
- split leakage وgroup/time separation.
- distribution/representation checks وشرائح الحد الأدنى.
- deterministic transform/checksum tests.
- deletion propagation وretention lifecycle tests.
- rollback/rebuild من نسخة immutable.
- evaluation regression والجودة/التكلفة/latency.

اختبار scan ناجح لا يثبت الدقة أو الترخيص أو التمثيل. مراجعة بشرية لعينة لا تثبت
كل السجلات. يجب نشر حدود كل اختبار وfalse-positive/negative behavior.

## 21. سجل القرارات

| القرار | الحالة | المطلوب للحسم |
|---|---|---|
| تدريب نموذج داخل المشروع | `NOT_APPROVED` | use case وبيانات وميزانية وخبرة ومراجعات |
| fine-tuning | `NOT_APPROVED` | baseline يثبت الحاجة ومجموعة مرخصة وتقييم |
| استخدام محادثات المستخدم للتدريب | `NOT_APPROVED` | أساس قانوني وموافقة وحقوق حذف وحوكمة |
| evaluation dataset | `NOT_DEFINED` | مهام ومقاييس ومصادر مرخصة وتمثيل |
| RAG corpus/vector store | `NOT_APPROVED` | حاجة وACL وخصوصية وجودة وتكلفة |
| data contract format | `NOT_DECIDED` | تقييم JSON Schema/manifest واحتياجات lineage |
| dataset/version registry | `NOT_DECIDED` | منصة وتخزين وصلاحيات وretention |
| quality thresholds | `NOT_DEFINED` | use case وخطر وbaseline |
| representation/fairness slices | `NOT_DECIDED` | population وقانون وخصوصية وحجم عينة |
| refresh cadence | `NOT_DECIDED` | source volatility وfreshness SLO ومالك |
| readiness لأي استخدام إنتاجي | `BLOCKED` | إغلاق بوابات القسم التالي |

## 22. بوابات الجاهزية

### مسموح الآن

- بيانات صناعية غير حساسة لاختبار العقود.
- تعريف مهام ومقاييس وrubrics دون جمع بيانات شخصية.
- جرد مصادر محتملة وحقوقها دون ingestion.
- توثيق quality checks في دفعات صغيرة منفصلة.

### مانع للتدريب أو RAG أو تحديث نموذج

- لا use case أو metric أو threshold قبول معتمد.
- لا dataset مرخصة ومحددة الإصدار وذات provenance كامل.
- لا تقييم خصوصية/قانون/أمن وموافقة مناسبة.
- لا train/validation/test split أو فحص leakage وتمثيل.
- لا baseline وانحياز وشرائح وتقييم جودة مستقل.
- لا pipeline تحديث وquarantine وrollback وملاك.
- لا خطة حذف وretention وlineage للمشتقات.
- لا ميزانية وحد تكلفة وتقييم مزود/نموذج.

### شرط تغيير الحالة

لا تصبح جودة البيانات `APPROVED` بكثرة السجلات أو نجاح schema check. يلزم دليل
مؤرخ على الدقة والحقوق والتمثيل والكفاية والتسرب والخصوصية، مع مقارنة baseline
ومراجعة بشرية وقبول صريح للمخاطر وخطة مراقبة وتحديث وتراجع.

## 23. العلاقة مع الوثائق الأخرى

- `AI_BACKEND_DESIGN.md`: المزود وسياسة البيانات وtokens والتكلفة.
- `SECURITY_ARCHITECTURE.md`: التصنيف والتشفير وIAM والخصوصية والامتثال.
- `RELIABILITY_ARCHITECTURE.md`: backup/restore وRPO/RTO للdatasets.
- `SCALABILITY_ARCHITECTURE.md`: حجم ingestion والتخزين والحمل.
- `MAINTAINABILITY_ARCHITECTURE.md`: الاختبارات والإصدارات وقابلية إعادة الإنتاج.
- `INTEROPERABILITY_ARCHITECTURE.md`: schemas والعقود والاستيراد والتصدير.
- `UX_ARCHITECTURE.md`: الموافقة والشفافية والتغذية الراجعة.
- `SUSTAINABILITY_ARCHITECTURE.md`: تكلفة التخزين والتدريب والتحديث ودورة الحياة.

عند التعارض تُطبق حماية المستخدم والحقوق والقانون والأمن قبل تحسين النموذج. لا تغير
هذه الوثيقة بنية `sync/` أو حالات المزامنة أو عقود التخزين أو التنقيح أو manifest،
ولا تسمح بإدخال `vault/` الخام أو الأسرار أو بيانات التدريب إلى Git.
